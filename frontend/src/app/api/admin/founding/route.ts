import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

/** GET → as reservas Founding Customers (public.founding_commitments_report). Só o dono. */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const { data, error } = await db().rpc("founding_commitments_report");
  if (error) {
    const missing = /founding_commitments_report|does not exist|schema cache/i.test(error.message);
    return errorJson(missing ? "Run supabase/migrations/20261111000000_founding_commitments.sql in the Supabase SQL Editor." : error.message, 500, "DB_ERROR");
  }
  return json({ report: data });
}
