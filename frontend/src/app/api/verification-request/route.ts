import { db, UUID_RE } from "@/lib/server/db";
import { emailOwner } from "@/lib/server/notify";
import { clientIp, EMAIL_RE, errorJson, hashIp, json } from "@/lib/server/request";
import { cleanAppUrl, cleanFlow, cleanText, crossSite, readJson } from "@/lib/server/waitlist";
import { SITE_URL } from "@/lib/site";
import { PAYING_LABELS, PAYING_OPTIONS, VERIFICATION_NOTE_MAX, type Paying } from "@/lib/verification";
import { PRIORITY_FLOW_LABELS } from "@/lib/waitlist";

export const runtime = "nodejs";

/** Menos que isso entre abrir o formulário e enviar é robô, não gente. */
const MIN_FILL_MS = 1500;
/** Pedidos por IP por hora. */
const MAX_PER_HOUR = 5;

/**
 * POST { email, flow, paying?, appUrl?, note?, checkId?, locale?, elapsedMs, website } → { status: "received" } (201).
 * "Quero que o Valmir verifique meu fluxo": grava em public.verification_requests e encaminha por e-mail ao fundador
 * (com o reply-to da pessoa). Responde sucesso se pelo menos um dos dois funcionou.
 * Erros: 400 (campos inválidos, robô), 403, 429, 500.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 4096);
  if (!body) return errorJson("Send a JSON body with your request.", 400, "BAD_REQUEST");

  if (cleanText(body.website, 200)) return errorJson("We couldn't send your request. Please try again.", 400, "REJECTED");
  if (typeof body.elapsedMs === "number" && body.elapsedMs < MIN_FILL_MS) return errorJson("That was fast. Please wait a second and try again.", 400, "TOO_FAST");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return errorJson("Enter a valid email address, like you@company.com.", 400, "INVALID_EMAIL");
  const flow = cleanFlow(body.flow);
  if (!flow) return errorJson("Choose the flow you'd like checked.", 400, "INVALID_FLOW");
  const paying: Paying | null = PAYING_OPTIONS.includes(body.paying as Paying) ? (body.paying as Paying) : null;
  const appUrl = cleanAppUrl(body.appUrl);
  const note = cleanText(body.note, VERIFICATION_NOTE_MAX);
  const checkId = typeof body.checkId === "string" && UUID_RE.test(body.checkId) ? body.checkId : null;
  const locale = body.locale === "pt" ? "pt" : "en";
  const ipHash = hashIp(clientIp(request));

  let saved: { id: string } | null = null;
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db().from("verification_requests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) return errorJson("We've got your requests. Please try again later.", 429, "RATE_LIMITED");
    const { data, error } = await db()
      .from("verification_requests")
      .insert({ email, app_url: appUrl, flow, paying, note, check_id: checkId, locale, ip_hash: ipHash })
      .select("id")
      .single();
    if (error) throw error;
    saved = data;
  } catch (error) {
    console.error("verification request save failed (has supabase/migrations/20261128000000_verification_requests.sql run?)", error);
  }

  const emailed = await emailOwner({
    subject: `Verification request: ${PRIORITY_FLOW_LABELS[flow].en}${paying === "yes" ? " · PAYING USERS" : ""} · ${email}`,
    replyTo: email,
    fields: [
      ["Email", email],
      ["Flow", PRIORITY_FLOW_LABELS[flow].en],
      ["Paying users", paying ? PAYING_LABELS[paying].en : "(not answered)"],
      ["App", appUrl ?? "(not given)"],
      ["Report", checkId ? `${SITE_URL}${locale === "pt" ? "/pt" : ""}/check/${checkId}` : "(none)"],
      ["Language", locale],
    ],
    body: note,
  });
  if (saved && emailed) await db().from("verification_requests").update({ emailed: true }).eq("id", saved.id).then(undefined, () => undefined);

  if (!saved && !emailed) return errorJson("We couldn't send your request. Please email us directly.", 500, "VERIFICATION_ERROR");
  return json({ status: "received" }, 201);
}
