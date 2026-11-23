import { checkStats } from "@/lib/server/checks";

export const runtime = "nodejs";

/**
 * GET → os números agregados e anônimos dos testes grátis (só contagens), para a home e o /check.
 * { stats: null } quando o banco não responde: o site simplesmente não mostra os números.
 */
export async function GET() {
  const stats = await checkStats().catch(() => null);
  return Response.json({ stats }, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
