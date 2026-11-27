import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CHECK_TEXT } from "@/lib/check/text";
import type { Locale } from "@/lib/i18n";
import { unstable_cache } from "next/cache";
import { runCheck } from "@/lib/check/run";
import { CHECK_LABELS, type CheckId, type CheckReport, type CheckResult, type CheckScreenshots, type CheckStats, type CheckStatus } from "@/lib/check/types";
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

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * Cria o teste e devolve o token que permite apagar o relatório. Só o hash fica no banco; o token vai
 * para o navegador de quem criou o teste (e só ele vê o botão "Delete this report").
 */
export async function createCheck(url: string, ipHash: string): Promise<{ id: string; deleteToken: string }> {
  const deleteToken = randomBytes(24).toString("base64url");
  const { data, error } = await db()
    .from("app_checks")
    .insert({ url, ip_hash: ipHash, status: "queued", delete_token_hash: sha256(deleteToken) })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, deleteToken };
}

/** Apaga o relatório se o token confere. Devolve false quando o teste não existe ou o token é outro. */
export async function deleteCheck(id: string, token: string): Promise<boolean> {
  const { data, error } = await db().from("app_checks").select("delete_token_hash").eq("id", id).maybeSingle();
  if (error) throw error;
  const stored = (data?.delete_token_hash as string | null | undefined) ?? null;
  if (!stored) return false;
  const given = Buffer.from(sha256(token));
  const expected = Buffer.from(stored);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  const { error: deleteError } = await db().from("app_checks").delete().eq("id", id);
  if (deleteError) throw deleteError;
  return true;
}

/**
 * Os números agregados dos testes que as pessoas fizeram nos próprios apps (só contagens).
 * Em cache por 10 minutos: a home e o /check pedem isso a cada visita.
 */
export const checkStats = unstable_cache(
  async (): Promise<CheckStats | null> => {
    try {
      const { data, error } = await db().rpc("app_check_stats");
      if (error) throw error;
      const raw = (data ?? {}) as { checked?: number; with_failure?: number; top_failure?: { id?: string; count?: number } | null };
      const topId = raw.top_failure?.id;
      return {
        checked: raw.checked ?? 0,
        withFailure: raw.with_failure ?? 0,
        topFailure: topId && topId in CHECK_LABELS ? { id: topId as CheckId, count: raw.top_failure?.count ?? 0 } : null,
      };
    } catch (error) {
      console.error("check stats unavailable", error instanceof Error ? error.message : error);
      return null;
    }
  },
  ["app-check-stats"],
  { revalidate: 600, tags: ["app-check-stats"] },
);

/** Roda um teste da fila. Só um processo pega cada teste (o update só vale se ainda estiver "queued"). */
export async function runQueuedCheck(id: string, locale: Locale = "en"): Promise<void> {
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
    const { result, screenshots } = await runCheck(new URL(data.url as string), { deadlineMs: CHECK_DEADLINE_MS, locale });
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
      .update({ status: "failed", error: CHECK_TEXT[locale].failed, finished_at: new Date().toISOString() })
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
