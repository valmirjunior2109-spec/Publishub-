import { db } from "@/lib/server/db";
import type { Utm, WaitlistForm } from "@/lib/waitlist";

/** Inscrições novas por IP, por hora (a função waitlist_join_ref conta). */
export const WAITLIST_MAX_PER_HOUR = 5;

export interface JoinInput {
  email: string;
  name?: string | null;
  aiTool?: string | null;
  appUrl?: string | null;
  invitedBy?: string | null;
  utm: Utm;
  referrer: string | null;
  form: WaitlistForm | null;
  ipHash: string;
}

export type JoinResult =
  | { status: "joined" | "duplicate"; refCode: string | null; position: number | null; referrals: number; total: number | null }
  | { status: "rate_limited" };

/** Grava a pessoa na lista de espera (ou reconhece que já estava). Lança erro se o banco não confirmar. */
export async function joinWaitlist(input: JoinInput): Promise<JoinResult> {
  const { data, error } = await db().rpc("waitlist_join_ref", {
    p_email: input.email,
    p_name: input.name ?? null,
    p_ai_tool: input.aiTool ?? null,
    p_app_url: input.appUrl ?? null,
    p_invited_by: input.invitedBy ?? null,
    p_utm_source: input.utm.utm_source ?? null,
    p_utm_medium: input.utm.utm_medium ?? null,
    p_utm_campaign: input.utm.utm_campaign ?? null,
    p_utm_content: input.utm.utm_content ?? null,
    p_referrer: input.referrer,
    p_form: input.form,
    p_ip_hash: input.ipHash,
    p_max_per_hour: WAITLIST_MAX_PER_HOUR,
  });
  if (error) throw error;

  const result = (data ?? {}) as { status?: string; ref_code?: string; position?: number; referrals?: number; total?: number };
  if (result.status === "rate_limited") return { status: "rate_limited" };
  if (result.status !== "joined" && result.status !== "duplicate") throw new Error(`waitlist_join_ref returned ${JSON.stringify(data)}`);
  return { status: result.status, refCode: result.ref_code ?? null, position: result.position ?? null, referrals: result.referrals ?? 0, total: result.total ?? null };
}
