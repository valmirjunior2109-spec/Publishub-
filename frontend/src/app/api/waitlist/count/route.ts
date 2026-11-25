import { db } from "@/lib/server/db";

export const runtime = "nodejs";

/**
 * GET → { total } : quantas pessoas estão na lista de espera, para a prova social ao lado dos formulários.
 * Só a contagem, nada que identifique alguém. { total: null } quando o banco não responde: o site
 * simplesmente não mostra o número.
 */
export async function GET() {
  let total: number | null = null;
  try {
    const { count, error } = await db().from("waitlist").select("id", { count: "exact", head: true });
    if (!error && typeof count === "number") total = count;
  } catch {
    total = null;
  }
  return Response.json({ total }, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
