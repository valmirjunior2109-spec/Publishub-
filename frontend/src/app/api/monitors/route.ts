import { ConfigError, UUID_RE } from "@/lib/server/db";
import { createMonitor } from "@/lib/server/monitors";
import { clientIp, EMAIL_RE, errorJson, hashIp, json } from "@/lib/server/request";
import { cleanText, crossSite, readJson } from "@/lib/server/waitlist";

export const runtime = "nodejs";

/** Menos que isso entre abrir o formulário e enviar é robô, não gente. */
const MIN_FILL_MS = 1200;

/**
 * POST { checkId, token, email, locale?, elapsedMs, website } → { status: "pending" | "active", emailed }.
 * Liga o monitor diário a partir de um relatório. Só do navegador que criou o teste (token = o de apagar o relatório).
 * Fica "pending" até a pessoa confirmar pelo link do e-mail.
 * Erros: 400, 403, 409 (limite de monitores), 429, 503, 500.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 2048);
  if (!body) return errorJson("Send a JSON body.", 400, "BAD_REQUEST");
  if (cleanText(body.website, 200)) return errorJson("We couldn't turn on the monitor. Please try again.", 400, "REJECTED");
  if (typeof body.elapsedMs === "number" && body.elapsedMs < MIN_FILL_MS) return errorJson("That was fast. Please wait a second and try again.", 400, "TOO_FAST");

  const checkId = typeof body.checkId === "string" && UUID_RE.test(body.checkId) ? body.checkId : null;
  const token = typeof body.token === "string" ? body.token : "";
  if (!checkId || !token) return errorJson("You can only monitor an app from the browser that ran its check.", 403, "FORBIDDEN");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return errorJson("Enter a valid email address, like you@company.com.", 400, "INVALID_EMAIL");
  const locale = body.locale === "pt" ? "pt" : "en";

  try {
    const result = await createMonitor({ checkId, deleteToken: token, email, locale, ipHash: hashIp(clientIp(request)) });
    if (result.status === "forbidden") return errorJson("You can only monitor an app from the browser that ran its check.", 403, "FORBIDDEN");
    if (result.status === "limit") return errorJson("This email already monitors 3 apps. Stop one to add another.", 409, "MONITOR_LIMIT");
    if (result.status === "rate_limited") return errorJson("Too many monitors from this network today. Please try again tomorrow.", 429, "RATE_LIMITED");
    return json(result, result.status === "pending" ? 201 : 200);
  } catch (error) {
    if (error instanceof ConfigError) return errorJson("The monitor isn't available right now.", 503, "NOT_CONFIGURED");
    console.error("monitor create failed (has supabase/migrations/20261128100000_monitors.sql run?)", error);
    return errorJson("We couldn't turn on the monitor. Please try again.", 500, "MONITOR_ERROR");
  }
}
