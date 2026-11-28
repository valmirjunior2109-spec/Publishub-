import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

/** GET → os pedidos de verificação manual (public.verification_requests), do mais novo ao mais antigo. Só o dono. */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const { data, error } = await db()
    .from("verification_requests")
    .select("id, email, app_url, flow, paying, note, check_id, locale, emailed, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    const missing = /verification_requests|does not exist|schema cache/i.test(error.message);
    return errorJson(missing ? "The verification requests table isn't in the database yet. Run supabase/migrations/20261128000000_verification_requests.sql in the Supabase SQL Editor." : error.message, 500, "DB_ERROR");
  }
  return json({ requests: data ?? [] });
}
