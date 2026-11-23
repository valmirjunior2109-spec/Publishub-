import { after } from "next/server";
import { assertPublicHost, InvalidUrlError, normalizeAppUrl } from "@/lib/check/url";
import { CHECK_LIMIT_PER_HOUR } from "@/lib/check/types";
import { countRecentChecks, createCheck, overGlobalLimit, runQueuedCheck } from "@/lib/server/checks";
import { ConfigError } from "@/lib/server/db";
import { clientIp, errorJson, hashIp, json } from "@/lib/server/request";
import { crossSite, readJson } from "@/lib/server/waitlist";

export const runtime = "nodejs";
// o teste roda depois da resposta (after), dentro do mesmo limite da função
export const maxDuration = 60;

/** POST { url } → { id }. Valida a URL (só endereços públicos), aplica os limites e começa o teste. */
export async function POST(request: Request) {
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const body = await readJson(request, 4096);
  if (!body) return errorJson("Send a JSON body with your app's URL.", 400, "BAD_REQUEST");

  try {
    const url = normalizeAppUrl(body.url);
    await assertPublicHost(url);

    const ipHash = hashIp(clientIp(request));
    if ((await countRecentChecks(ipHash)) >= CHECK_LIMIT_PER_HOUR) {
      return errorJson(`You can run up to ${CHECK_LIMIT_PER_HOUR} free checks per hour. Please try again later.`, 429, "RATE_LIMITED");
    }
    if (await overGlobalLimit()) return errorJson("Lots of people are checking their apps right now. Please try again in a few minutes.", 429, "BUSY");

    const id = await createCheck(url.href, ipHash);
    after(() => runQueuedCheck(id));
    return json({ id, url: url.href }, 201);
  } catch (error) {
    if (error instanceof InvalidUrlError) return errorJson(error.message, 400, "INVALID_URL");
    if (error instanceof ConfigError) return errorJson("Free checks aren't available right now. Please try again later.", 503, "NOT_CONFIGURED");
    console.error("app check create failed", error);
    return errorJson("We couldn't start the check. Please try again.", 500, "CHECK_ERROR");
  }
}
