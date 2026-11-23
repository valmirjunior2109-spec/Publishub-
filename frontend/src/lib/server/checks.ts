import { runCheck } from "@/lib/check/run";
import type { CheckReport, CheckResult, CheckScreenshots, CheckStatus } from "@/lib/check/types";
import { db } from "./db";
import { captureServer } from "./posthog";

/**
 * O teste grátis no banco (public.app_checks): cria, roda e lê. O teste roda depois da resposta
 * da rota (after), dentro do limite de 60 s da função; o relatório consulta até terminar.
 */

/** Prazo do teste: cabe nos 60 s da função na Vercel, com folga para gravar o resultado. */
export const CHECK_DEADLINE_MS = Number(process.env.CHECK_DEADLINE_MS) || 45000;
/** Um teste "running" há mais que isso morreu no meio (a função foi encerrada). */
const STALE_MS = 3 * 60 * 1000;
/** Teto de testes por hora no site inteiro: o custo de navegador não dispara com um robô. */
const GLOBAL_PER_HOUR = Number(process.env.CHECK_GLOBAL_PER_HOUR) || 300;

export async function countRecentChecks(ipHash: string | null): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  let query = db().from("app_checks").select("id", { count: "exact", head: true }).gte("created_at", since);
  if (ipHash) query = query.eq("ip_hash", ipHash);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function overGlobalLimit(): Promise<boolean> {
  return (await countRecentChecks(null)) >= GLOBAL_PER_HOUR;
}

export async function createCheck(url: string, ipHash: string): Promise<string> {
  const { data, error } = await db().from("app_checks").insert({ url, ip_hash: ipHash, status: "queued" }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** Roda um teste da fila. Só um processo pega cada teste (o update só vale se ainda estiver "queued"). */
export async function runQueuedCheck(id: string): Promise<void> {
  const { data, error } = await db()
    .from("app_checks")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("url")
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  try {
    const { result, screenshots } = await runCheck(new URL(data.url as string), { deadlineMs: CHECK_DEADLINE_MS });
    const { error: saveError } = await db()
      .from("app_checks")
      .update({ status: "done", result, screenshots, finished_at: new Date().toISOString() })
      .eq("id", id);
    if (saveError) throw saveError;
    await captureServer("app_check_completed", id, { fail: result.summary.fail, warn: result.summary.warn, pass: result.summary.pass, duration_ms: result.meta.durationMs });
  } catch (error) {
    console.error("app check failed", id, error);
    await db()
      .from("app_checks")
      .update({ status: "failed", error: "We couldn't finish the check. Please try again in a minute.", finished_at: new Date().toISOString() })
      .eq("id", id);
  }
}

/** O relatório público de um teste (o id é um uuid aleatório: quem tem o link vê). */
export async function getCheck(id: string): Promise<CheckReport | null> {
  const { data, error } = await db().from("app_checks").select("id,url,status,created_at,started_at,error,result,screenshots").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let status = data.status as CheckStatus;
  let message = (data.error as string | null) ?? null;
  const since = Date.parse((data.started_at as string | null) ?? (data.created_at as string));
  if ((status === "running" || status === "queued") && Date.now() - since > STALE_MS) {
    status = "failed";
    message = "The check took too long and stopped. Please try again.";
    await db().from("app_checks").update({ status, error: message, finished_at: new Date().toISOString() }).eq("id", id).in("status", ["queued", "running"]);
  }
  return {
    id: data.id as string,
    url: data.url as string,
    status,
    createdAt: data.created_at as string,
    error: message,
    result: (data.result as CheckResult | null) ?? null,
    screenshots: (data.screenshots as CheckScreenshots | null) ?? null,
  };
}
