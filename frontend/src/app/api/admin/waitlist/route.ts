import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

const WINDOWS: Record<string, number | null> = { "24h": 24, "72h": 72, "7d": 24 * 7, all: null };

/** GET ?window=24h|72h|7d|all → o relatório da lista de espera (public.waitlist_report). Só o dono. */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const key = new URL(request.url).searchParams.get("window") ?? "all";
  const hours = key in WINDOWS ? WINDOWS[key] : null;
  const since = hours === null ? null : new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await db().rpc("waitlist_report", { p_since: since });
  if (error) {
    const missing = /waitlist_report|does not exist|schema cache/i.test(error.message);
    return errorJson(missing ? "The waitlist tables aren't in the database yet. Run supabase/migrations/20261108100000_waitlist.sql in the Supabase SQL Editor." : error.message, 500, "DB_ERROR");
  }
  return json({ window: key in WINDOWS ? key : "all", report: data });
}
