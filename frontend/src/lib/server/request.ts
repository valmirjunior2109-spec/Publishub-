import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** De onde veio o pedido: o X-Real-IP do proxy da Vercel, ou o começo do X-Forwarded-For. */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return real || forwarded || "unknown";
}

// SCAN_HASH_SECRET: o nome é histórico (veio do produto anterior). Trocar o sal muda os hashes já gravados,
// o que só zera o rate limit da lista de espera; por isso o nome continua o mesmo.
function secret(): string {
  return process.env.SCAN_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "publishub-dev-secret";
}

/** O IP nunca é guardado: só um hash com sal, para o rate limit e o anti-spam da lista de espera. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${secret()}:ip:${ip}`).digest("hex");
}

/** Uma assinatura curta (HMAC com o mesmo sal do hash de IP), para tokens que o servidor confere sem banco. */
export function sign(label: string, value: string): string {
  return createHmac("sha256", secret()).update(`${label}:${value}`).digest("base64url").slice(0, 32);
}

export function verifySignature(label: string, value: string, signature: unknown): boolean {
  if (typeof signature !== "string" || signature.length !== 32) return false;
  const expected = Buffer.from(sign(label, value));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function errorJson(message: string, status: number, code?: string): Response {
  return json({ error: { message, code } }, status);
}
