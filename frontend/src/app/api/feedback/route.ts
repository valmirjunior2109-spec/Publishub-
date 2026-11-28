import { db } from "@/lib/server/db";
import { ownerEmail } from "@/lib/server/notify";
import { clientIp, EMAIL_RE, errorJson, hashIp, json } from "@/lib/server/request";
import { cleanText, crossSite, readJson } from "@/lib/server/waitlist";
import { FEEDBACK_LIVE_APP, FEEDBACK_MESSAGE_MAX, FEEDBACK_VERDICTS, type FeedbackLiveApp, type FeedbackVerdict } from "@/lib/feedback";

export const runtime = "nodejs";

/** Menos que isso entre abrir a página e enviar é robô, não gente. */
const MIN_FILL_MS = 1500;
/** Respostas por IP por hora: o bastante para quem quer completar o que disse, pouco para spam. */
const MAX_PER_HOUR = 5;
/** Para onde vai cada feedback: FEEDBACK_TO_EMAIL, ou o e-mail do dono (ADMIN_EMAIL). */
const FEEDBACK_TO = ownerEmail();

/** Como cleanText, mas mantém as quebras de linha da mensagem. */
function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, FEEDBACK_MESSAGE_MAX);
  return text || null;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Encaminha o feedback por e-mail via Resend (API HTTP, sem dependência nova).
 * Sem RESEND_API_KEY, não envia: o feedback fica só no banco.
 */
async function sendEmail(entry: { verdict: string; liveApp: string | null; message: string; email: string | null }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const from = process.env.FEEDBACK_FROM_EMAIL?.trim() || "Publishub Feedback <feedback@getpublishub.com>";
  const lines = [
    ["Reaction", entry.verdict],
    ["Where they'd run it", entry.liveApp ?? "(not answered)"],
    ["Reply to", entry.email ?? "(anonymous)"],
  ];
  const text = `${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${entry.message}`;
  const html =
    `<table cellpadding="4">${lines.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join("")}</table>` +
    `<p style="white-space:pre-wrap">${escapeHtml(entry.message)}</p>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [FEEDBACK_TO],
        ...(entry.email ? { reply_to: entry.email } : {}),
        subject: `Proposal feedback: ${entry.verdict}${entry.email ? ` from ${entry.email}` : ""}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("feedback email failed", response.status, await response.text().catch(() => ""));
    return response.ok;
  } catch (error) {
    console.error("feedback email failed", error);
    return false;
  }
}

/**
 * POST { verdict, liveApp?, message, email?, elapsedMs, website } → { status: "received" } (201).
 * Grava no Supabase e encaminha para FEEDBACK_TO. Responde sucesso se pelo menos um dos dois funcionou.
 * Erros: 400 (campos inválidos, robô), 403, 429, 500.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 16_384);
  if (!body) return errorJson("Send a JSON body with your feedback.", 400, "BAD_REQUEST");

  if (cleanText(body.website, 200)) return errorJson("We couldn't send your feedback. Please try again.", 400, "REJECTED");
  if (typeof body.elapsedMs === "number" && body.elapsedMs < MIN_FILL_MS) return errorJson("That was fast. Please wait a second and try again.", 400, "TOO_FAST");

  const verdict = FEEDBACK_VERDICTS.find((v) => v.value === body.verdict);
  if (!verdict) return errorJson("Pick how you feel about the proposal.", 400, "INVALID_VERDICT");
  const liveApp = FEEDBACK_LIVE_APP.find((v) => v.value === body.liveApp) ?? null;

  const message = cleanMessage(body.message);
  if (!message) return errorJson("Tell us what you think in a sentence or two.", 400, "INVALID_MESSAGE");

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (rawEmail && (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail))) return errorJson("Enter a valid email address, or leave it empty.", 400, "INVALID_EMAIL");
  const email = rawEmail || null;

  const ipHash = hashIp(clientIp(request));

  // banco: rate limit e cópia de segurança. Se o Supabase não estiver configurado, segue só com o e-mail.
  let saved: { id: string } | null = null;
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db().from("proposal_feedback").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) return errorJson("Thanks, we've got plenty from you this hour. Please try again later.", 429, "RATE_LIMITED");
    const { data, error } = await db()
      .from("proposal_feedback")
      .insert({ verdict: verdict.value satisfies FeedbackVerdict, live_app: (liveApp?.value ?? null) satisfies FeedbackLiveApp | null, message, email, ip_hash: ipHash })
      .select("id")
      .single();
    if (error) throw error;
    saved = data;
  } catch (error) {
    console.error("feedback save failed", error);
  }

  const emailed = await sendEmail({ verdict: verdict.label, liveApp: liveApp?.label ?? null, message, email });
  if (saved && emailed) await db().from("proposal_feedback").update({ emailed: true }).eq("id", saved.id).then(undefined, () => undefined);

  if (!saved && !emailed) return errorJson("We couldn't send your feedback. Please email us directly.", 500, "FEEDBACK_ERROR");
  return json({ status: "received" }, 201);
}
