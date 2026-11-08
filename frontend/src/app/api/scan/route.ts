import { after } from "next/server";
import { assertPublicHost, InvalidUrlError, normalizeStoreUrl } from "@/lib/scanner/url";
import { ConfigError } from "@/lib/server/db";
import { clientIp, errorJson, hashIp, json } from "@/lib/server/request";
import { claimScan, countRecentScans, createScan, RATE_LIMIT_PER_HOUR, runClaimedScan, scannerMode } from "@/lib/server/scans";

export const runtime = "nodejs";
// o scan roda depois da resposta (after), dentro do mesmo limite da função
export const maxDuration = 60;

/** POST { url } → { scanId }. Valida a URL, aplica o limite por IP e enfileira (ou roda) o scan. */
export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorJson("Send a JSON body with the store URL.", 400, "BAD_REQUEST");
  }

  try {
    const url = normalizeStoreUrl(body.url);
    await assertPublicHost(url);

    const ipHash = hashIp(clientIp(request));
    if ((await countRecentScans(ipHash)) >= RATE_LIMIT_PER_HOUR) {
      return errorJson(`You can run up to ${RATE_LIMIT_PER_HOUR} scans per hour. Please try again later.`, 429, "RATE_LIMITED");
    }

    const scanId = await createScan(url.origin, ipHash, "web");
    if (scannerMode() === "vercel") {
      after(async () => {
        if (await claimScan(scanId)) await runClaimedScan(scanId);
      });
    }
    return json({ scanId, url: url.origin }, 201);
  } catch (error) {
    if (error instanceof InvalidUrlError) return errorJson(error.message, 400, "INVALID_URL");
    if (error instanceof ConfigError) return errorJson("The scanner isn't configured yet.", 503, "NOT_CONFIGURED");
    console.error("scan create failed", error);
    return errorJson("We couldn't start the scan. Please try again.", 500, "SCAN_ERROR");
  }
}
