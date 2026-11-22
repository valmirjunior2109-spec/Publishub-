import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

/**
 * As reservas de US$ 49 do produto descontinuado (public.reservations), as mais recentes primeiro.
 * Ficam no /admin só como registro histórico: são pagamentos de clientes reais, para conferir e reembolsar.
 */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const reservations = await db()
    .from("reservations")
    .select("email,store_url,status,amount,currency,stripe_session_id,created_at,paid_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (reservations.error) return errorJson(reservations.error.message, 500, "DB_ERROR");
  return json({ admin, reservations: reservations.data });
}
