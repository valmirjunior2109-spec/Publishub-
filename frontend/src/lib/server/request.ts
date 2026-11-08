import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** De onde veio o pedido: o X-Real-IP do proxy da Vercel, ou o começo do X-Forwarded-For. */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return real || forwarded || "unknown";
}

function secret(): string {
  return process.env.SCAN_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "publishub-dev-secret";
}

/** O IP nunca é guardado: só um hash com sal, para o rate limit. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${secret()}:ip:${ip}`).digest("hex");
}

/** O token que abre o relatório completo neste navegador, depois que o e-mail foi deixado. */
export function unlockToken(scanId: string): string {
  return createHmac("sha256", secret()).update(`unlock:${scanId}`).digest("hex").slice(0, 32);
}

export function unlockCookieName(scanId: string): string {
  return `pu_${scanId.replace(/-/g, "").slice(0, 16)}`;
}

export function isUnlocked(scanId: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = Buffer.from(unlockToken(scanId));
  const given = Buffer.from(cookieValue);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function errorJson(message: string, status: number, code?: string): Response {
  return json({ error: { message, code } }, status);
}
