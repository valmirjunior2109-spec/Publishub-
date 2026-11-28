import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

/** GET → os monitores (public.monitors), do mais novo ao mais antigo. Só o dono. */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const { data, error } = await db()
    .from("monitors")
    .select("id, url, email, locale, status, baseline_check_id, last_run_at, last_alert_at, alerts_sent, created_at, confirmed_at, stopped_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    const missing = /monitors|does not exist|schema cache/i.test(error.message);
    return errorJson(missing ? "The monitors table isn't in the database yet. Run supabase/migrations/20261128100000_monitors.sql in the Supabase SQL Editor." : error.message, 500, "DB_ERROR");
  }
  return json({ monitors: data ?? [] });
}
