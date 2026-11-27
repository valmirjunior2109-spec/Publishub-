import { after } from "next/server";
import { assertPublicHost, InvalidUrlError, normalizeAppUrl } from "@/lib/check/url";
import { CHECK_LIMIT_PER_HOUR } from "@/lib/check/types";
import { countRecentChecks, createCheck, overGlobalLimit, runQueuedCheck } from "@/lib/server/checks";
import { ConfigError } from "@/lib/server/db";
import { clientIp, EMAIL_RE, errorJson, hashIp, json } from "@/lib/server/request";
import { cleanRef, cleanUtm, crossSite, readJson, referrerHost } from "@/lib/server/waitlist";
import { joinWaitlist, type JoinResult } from "@/lib/server/waitlist-join";

export const runtime = "nodejs";
// o teste roda depois da resposta (after), dentro do mesmo limite da função
export const maxDuration = 60;

/**
 * POST { url, email, utm?, referrer?, ref? } → { id, url, deleteToken, waitlist }.
 * O e-mail é obrigatório: a pessoa entra na lista de espera (form "check", com a URL testada)
 * antes do teste começar. Valida a URL (só endereços públicos), aplica os limites e começa o teste.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 4096);
  if (!body) return errorJson("Send a JSON body with your app's URL.", 400, "BAD_REQUEST");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return errorJson("Enter your email to get your report.", 400, "INVALID_EMAIL");
  if (email.length > 254 || !EMAIL_RE.test(email)) return errorJson("Enter a valid email address, like you@company.com.", 400, "INVALID_EMAIL");

  try {
    const url = normalizeAppUrl(body.url);
    await assertPublicHost(url);

    const ipHash = hashIp(clientIp(request));
    if ((await countRecentChecks(ipHash)) >= CHECK_LIMIT_PER_HOUR) {
      return errorJson(`You can run up to ${CHECK_LIMIT_PER_HOUR} free checks per hour. Please try again later.`, 429, "RATE_LIMITED");
    }
    if (await overGlobalLimit()) return errorJson("Lots of people are checking their apps right now. Please try again in a few minutes.", 429, "BUSY");

    // primeiro a lista de espera: sem o e-mail gravado, o teste não começa
    const waitlist: JoinResult = await joinWaitlist({
      email,
      appUrl: url.href.slice(0, 300),
      invitedBy: cleanRef(body.ref),
      utm: cleanUtm(body.utm),
      referrer: referrerHost(body.referrer, request.headers.get("x-forwarded-host") || request.headers.get("host")),
      form: "check",
      ipHash,
    });

    const { id, deleteToken } = await createCheck(url.href, ipHash);
    after(() => runQueuedCheck(id, body.locale === "pt" ? "pt" : "en"));
    // o token fica só no navegador de quem criou o teste: é o que permite apagar o relatório
    return json({ id, url: url.href, deleteToken, waitlist }, 201);
  } catch (error) {
    if (error instanceof InvalidUrlError) return errorJson(error.message, 400, "INVALID_URL");
    if (error instanceof ConfigError) return errorJson("Free checks aren't available right now. Please try again later.", 503, "NOT_CONFIGURED");
    console.error("app check create failed", error);
    return errorJson("We couldn't start the check. Please try again.", 500, "CHECK_ERROR");
  }
}
