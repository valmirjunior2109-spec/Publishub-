import { timingSafeEqual } from "node:crypto";

/**
 * As chamadas do agendamento: a Vercel manda "Authorization: Bearer <CRON_SECRET>" quando a variável CRON_SECRET
 * existe no projeto. Sem a variável, nada roda (é melhor o monitor parado do que uma rota aberta que dispara navegadores).
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
