import { after } from "next/server";
import { assertPublicHost, InvalidUrlError, normalizeAppUrl } from "@/lib/check/url";
import { CHECK_LIMIT_PER_HOUR } from "@/lib/check/types";
import { checkUrlForOwner, countRecentChecks, createCheck, overGlobalLimit, runQueuedCheck } from "@/lib/server/checks";
import { ConfigError, UUID_RE } from "@/lib/server/db";
import { clientIp, errorJson, hashIp, json } from "@/lib/server/request";
import { crossSite, readJson } from "@/lib/server/waitlist";

export const runtime = "nodejs";
// o teste roda depois da resposta (after), dentro do mesmo limite da função
export const maxDuration = 60;

/**
 * POST { token, locale? } → { id, deleteToken }.
 * "Testar de novo depois de corrigir": um teste novo da mesma URL, para comparar com este. Só quem criou o
 * teste pode (o token de apagar está no navegador dessa pessoa), então não pede o e-mail de novo: a pessoa
 * já está na lista. A URL é validada de novo (o endereço pode ter mudado de IP) e os limites por hora valem.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (crossSite(request)) return errorJson("Not allowed.", 403, "FORBIDDEN");
  if (!UUID_RE.test(id)) return errorJson("Check not found.", 404, "NOT_FOUND");
  const body = await readJson(request, 1024);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return errorJson("You can only re-run a check from the browser that created it.", 403, "FORBIDDEN");

  try {
    const stored = await checkUrlForOwner(id, token);
    if (!stored) return errorJson("You can only re-run a check from the browser that created it.", 403, "FORBIDDEN");
    const url = normalizeAppUrl(stored);
    await assertPublicHost(url);

    const ipHash = hashIp(clientIp(request));
    if ((await countRecentChecks(ipHash)) >= CHECK_LIMIT_PER_HOUR) {
      return errorJson(`You can run up to ${CHECK_LIMIT_PER_HOUR} free checks per hour. Please try again later.`, 429, "RATE_LIMITED");
    }
    if (await overGlobalLimit()) return errorJson("Lots of people are checking their apps right now. Please try again in a few minutes.", 429, "BUSY");

    const created = await createCheck(url.href, ipHash);
    after(() => runQueuedCheck(created.id, body?.locale === "pt" ? "pt" : "en"));
    return json({ id: created.id, deleteToken: created.deleteToken }, 201);
  } catch (error) {
    if (error instanceof InvalidUrlError) return errorJson(error.message, 400, "INVALID_URL");
    if (error instanceof ConfigError) return errorJson("Free checks aren't available right now. Please try again later.", 503, "NOT_CONFIGURED");
    console.error("app check re-run failed", error);
    return errorJson("We couldn't start the check. Please try again.", 500, "CHECK_ERROR");
  }
}
