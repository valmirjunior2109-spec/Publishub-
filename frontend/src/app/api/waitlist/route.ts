import { ConfigError } from "@/lib/server/db";
import { addWaitlistContext, contextToken } from "@/lib/server/waitlist-context";
import { joinWaitlist } from "@/lib/server/waitlist-join";
import { clientIp, EMAIL_RE, errorJson, hashIp, json } from "@/lib/server/request";
import { cleanAppUrl, cleanBuilding, cleanConversionPath, cleanFirstTouch, cleanFlow, cleanForm, cleanRef, cleanText, cleanTool, cleanUtm, crossSite, readJson, referrerHost } from "@/lib/server/waitlist";

export const runtime = "nodejs";

/** Menos que isso entre abrir a página e enviar é robô, não gente. */
const MIN_FILL_MS = 800;

/**
 * POST { email, name?, aiTool?, appUrl?, priorityFlow?, building?, ref?, form, utm, referrer, firstTouch?, conversionPath?, elapsedMs, website }
 *   → { status, refCode, position, referrals, total, contextToken }.
 * O fluxo prioritário, o "o que está construindo", a primeira origem e a página da inscrição são opcionais
 * e gravados depois da inscrição: se falharem, a inscrição continua valendo.
 * "joined" (201) ou "duplicate" (200), com o link de indicação e a posição na fila.
 * Erros: 400 (e-mail inválido, robô), 429, 503.
 * Nunca responde sucesso sem a linha estar gravada no banco.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 8192);
  if (!body) return errorJson("Send a JSON body with your email.", 400, "BAD_REQUEST");

  // o campo "website" fica escondido de gente: só robô preenche
  if (cleanText(body.website, 200)) return errorJson("We couldn't add you to the list. Please try again.", 400, "REJECTED");
  if (typeof body.elapsedMs === "number" && body.elapsedMs < MIN_FILL_MS) return errorJson("That was fast. Please wait a second and try again.", 400, "TOO_FAST");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return errorJson("Enter your email address.", 400, "INVALID_EMAIL");
  if (email.length > 254 || !EMAIL_RE.test(email)) return errorJson("Enter a valid email address, like you@company.com.", 400, "INVALID_EMAIL");

  const utm = cleanUtm(body.utm);
  const ownHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const referrer = referrerHost(body.referrer, ownHost);
  const form = cleanForm(body.form);
  const ipHash = hashIp(clientIp(request));

  try {
    const result = await joinWaitlist({
      email,
      name: cleanText(body.name, 80),
      aiTool: cleanTool(body.aiTool),
      appUrl: cleanAppUrl(body.appUrl),
      invitedBy: cleanRef(body.ref),
      utm,
      referrer,
      form,
      ipHash,
    });
    if (result.status === "rate_limited") return errorJson("Too many signups from this network. Please try again in an hour.", 429, "RATE_LIMITED");

    await addWaitlistContext(result.refCode, {
      priorityFlow: cleanFlow(body.priorityFlow),
      building: cleanBuilding(body.building),
      firstTouch: cleanFirstTouch(request, body.firstTouch, ownHost),
      conversionPath: cleanConversionPath(body.conversionPath),
    });

    return json(
      { status: result.status, refCode: result.refCode, position: result.position, referrals: result.referrals, total: result.total, contextToken: contextToken(result.refCode) },
      result.status === "joined" ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("The waitlist isn't available right now. Please try again later.", 503, "NOT_CONFIGURED");
    console.error("waitlist join failed", error);
    return errorJson("We couldn't save your email. Please try again.", 500, "WAITLIST_ERROR");
  }
}
