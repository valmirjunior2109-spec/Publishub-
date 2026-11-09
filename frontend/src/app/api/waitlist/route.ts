import { ConfigError, db } from "@/lib/server/db";
import { clientIp, EMAIL_RE, errorJson, hashIp, json } from "@/lib/server/request";
import { cleanForm, cleanText, cleanTool, cleanUtm, crossSite, readJson, referrerHost } from "@/lib/server/waitlist";

export const runtime = "nodejs";

/** Inscrições novas por IP, por hora (a função waitlist_join conta). */
const MAX_PER_HOUR = 5;
/** Menos que isso entre abrir a página e enviar é robô, não gente. */
const MIN_FILL_MS = 800;

/**
 * POST { email, name?, aiTool?, form, utm, referrer, elapsedMs, website } → { status }.
 * "joined" (201) ou "duplicate" (200). Erros: 400 (e-mail inválido, robô), 429, 503.
 * Nunca responde sucesso sem a linha estar gravada no banco.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request);
  if (!body) return errorJson("Send a JSON body with your email.", 400, "BAD_REQUEST");

  // o campo "website" fica escondido de gente: só robô preenche
  if (cleanText(body.website, 200)) return errorJson("We couldn't add you to the list. Please try again.", 400, "REJECTED");
  if (typeof body.elapsedMs === "number" && body.elapsedMs < MIN_FILL_MS) return errorJson("That was fast. Please wait a second and try again.", 400, "TOO_FAST");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return errorJson("Enter your email address.", 400, "INVALID_EMAIL");
  if (email.length > 254 || !EMAIL_RE.test(email)) return errorJson("Enter a valid email address, like you@company.com.", 400, "INVALID_EMAIL");

  const utm = cleanUtm(body.utm);
  const referrer = referrerHost(body.referrer, request.headers.get("x-forwarded-host") || request.headers.get("host"));
  const form = cleanForm(body.form);
  const ipHash = hashIp(clientIp(request));

  try {
    const { data, error } = await db().rpc("waitlist_join", {
      p_email: email,
      p_name: cleanText(body.name, 80),
      p_ai_tool: cleanTool(body.aiTool),
      p_utm_source: utm.utm_source ?? null,
      p_utm_medium: utm.utm_medium ?? null,
      p_utm_campaign: utm.utm_campaign ?? null,
      p_utm_content: utm.utm_content ?? null,
      p_referrer: referrer,
      p_form: form,
      p_ip_hash: ipHash,
      p_max_per_hour: MAX_PER_HOUR,
    });
    if (error) throw error;

    if (data === "rate_limited") return errorJson("Too many signups from this network. Please try again in an hour.", 429, "RATE_LIMITED");
    if (data !== "joined" && data !== "duplicate") throw new Error(`waitlist_join returned ${JSON.stringify(data)}`);

    return json({ status: data }, data === "joined" ? 201 : 200);
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("The waitlist isn't available right now. Please try again later.", 503, "NOT_CONFIGURED");
    console.error("waitlist join failed", error);
    return errorJson("We couldn't save your email. Please try again.", 500, "WAITLIST_ERROR");
  }
}
