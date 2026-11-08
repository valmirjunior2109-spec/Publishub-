import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";
import { scannerMode } from "@/lib/server/scans";

export const runtime = "nodejs";

/** Tudo o que o /admin lista: scans, leads e reservas, os mais recentes primeiro. */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const [scans, leads, reservations] = await Promise.all([
    db().from("scans").select("id,url,status,risk_score,is_shopify,source,created_at,error").order("created_at", { ascending: false }).limit(300),
    db().from("leads").select("email,store_url,scan_id,source,created_at").not("scan_id", "is", null).order("created_at", { ascending: false }).limit(1000),
    db().from("reservations").select("email,store_url,scan_id,status,amount,currency,stripe_session_id,created_at,paid_at").order("created_at", { ascending: false }).limit(1000),
  ]);
  const failed = [scans, leads, reservations].find((result) => result.error);
  if (failed?.error) return errorJson(failed.error.message, 500, "DB_ERROR");
  return json({ admin, mode: scannerMode(), scans: scans.data, leads: leads.data, reservations: reservations.data });
}
