import { adminFromRequest } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { errorJson, json } from "@/lib/server/request";

export const runtime = "nodejs";

/** GET → os feedbacks sobre a proposta (public.proposal_feedback), do mais novo ao mais antigo. Só o dono. */
export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return errorJson("Not allowed.", 403, "FORBIDDEN");
  const { data, error } = await db()
    .from("proposal_feedback")
    .select("id, verdict, live_app, message, email, emailed, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    const missing = /proposal_feedback|does not exist|schema cache/i.test(error.message);
    return errorJson(missing ? "The feedback table isn't in the database yet. Run supabase/migrations/20261126000000_proposal_feedback.sql in the Supabase SQL Editor." : error.message, 500, "DB_ERROR");
  }
  return json({ feedback: data ?? [] });
}
