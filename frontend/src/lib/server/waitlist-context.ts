import type { FirstTouch } from "@/lib/attribution";
import { db } from "@/lib/server/db";
import { sign, verifySignature } from "@/lib/server/request";
import { REF_CODE_RE, type PriorityFlow } from "@/lib/waitlist";

/**
 * O contexto opcional de quem está na lista de espera: qual fluxo verificar primeiro, o que está
 * construindo, a primeira origem (first-touch) e a página onde se inscreveu. Fica separado da inscrição
 * de propósito: se isto falhar (a migração 20261127000000 ainda não rodou, por exemplo), a inscrição já
 * foi gravada e a pessoa vê o sucesso normalmente.
 *
 * A função do banco só preenche o que ainda está vazio: nada aqui apaga ou troca o que a pessoa já disse.
 */

const LABEL = "waitlist-context";

/**
 * O token que permite completar o contexto depois da inscrição (o formulário "ajude a priorizar" do
 * relatório). Vai só para o navegador de quem se inscreveu; o código de indicação sozinho, que circula
 * nos links públicos, não basta.
 */
export function contextToken(refCode: string | null): string | null {
  return refCode && REF_CODE_RE.test(refCode) ? sign(LABEL, refCode) : null;
}

export function validContextToken(refCode: unknown, token: unknown): refCode is string {
  return typeof refCode === "string" && REF_CODE_RE.test(refCode) && verifySignature(LABEL, refCode, token);
}

export interface WaitlistContext {
  aiTool?: string | null;
  priorityFlow?: PriorityFlow | null;
  building?: string | null;
  firstTouch?: FirstTouch | null;
  conversionPath?: string | null;
}

const hasAny = (context: WaitlistContext) => Object.values(context).some((value) => value !== null && value !== undefined);

/** Completa o contexto da inscrição. Nunca lança: devolve false e registra no log se não deu. */
export async function addWaitlistContext(refCode: string | null, context: WaitlistContext): Promise<boolean> {
  if (!refCode || !REF_CODE_RE.test(refCode) || !hasAny(context)) return false;
  try {
    const { data, error } = await db().rpc("waitlist_add_context", {
      p_ref_code: refCode,
      p_ai_tool: context.aiTool ?? null,
      p_priority_flow: context.priorityFlow ?? null,
      p_building: context.building ?? null,
      p_first_touch: context.firstTouch ?? null,
      p_conversion_path: context.conversionPath ?? null,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error("waitlist context not saved (has supabase/migrations/20261127000000_check_funnel_context.sql run?)", error);
    return false;
  }
}
