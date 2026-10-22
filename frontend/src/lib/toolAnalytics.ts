"use client";

import { capture, type AnalyticsEvent } from "./analytics";

/**
 * O funil das ferramentas grátis no PostHog, com os mesmos nomes nas três:
 *
 *   free_tool_viewed → free_tool_started → free_tool_completed | free_tool_failed
 *
 * mais repeat_analysis_started (o mesmo navegador voltou a usar a ferramenta),
 * report_shared e upgrade_cta_clicked. Vão pelo `capture` de lib/analytics, então
 * levam a origem da primeira visita (first_source, first_campaign…) e passam pela
 * mesma limpeza de URL. Nunca vai junto o conteúdo: nem a frase do gancho, nem o
 * print, nem o texto do relatório; só números, códigos de erro e rótulos.
 *
 * A ferramenta de onde a pessoa saiu para se cadastrar ou pagar fica guardada
 * (`rememberToolOrigin`): signup_completed e checkout_clicked levam `from_tool`.
 */
export type ToolName = "video_audit" | "retention_curve" | "hook_score";

type Props = Record<string, string | number | boolean | null>;

const RUNS_KEY = "publishub:tool_runs";
const ONCE_KEY = "publishub:tool_once";
const ORIGIN_KEY = "publishub:tool_origin";
/** Depois disso o cadastro já não é atribuído à ferramenta. */
const ORIGIN_TTL_MS = 24 * 3600 * 1000;

function read<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(window.localStorage.getItem(key) || "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento bloqueado: a medição desta visita continua, só não lembra a próxima
  }
}

function lang(): string {
  return typeof document === "undefined" ? "" : document.documentElement.lang;
}

/** Quantas vezes este navegador terminou esta ferramenta. */
export function toolRuns(tool: ToolName): number {
  return read<Record<string, number>>(RUNS_KEY, {})[tool] ?? 0;
}

export function captureTool(event: AnalyticsEvent, tool: ToolName, props: Props = {}, analysisId: string | null = null): void {
  capture(event, analysisId, lang(), { tool, ...props });
}

/** O começo de um uso. Quem já terminou esta ferramenta antes ganha também repeat_analysis_started. */
export function toolStarted(tool: ToolName, props: Props = {}): void {
  const runs = toolRuns(tool);
  captureTool("free_tool_started", tool, { ...props, previous_runs: runs });
  if (runs > 0) captureTool("repeat_analysis_started", tool, { ...props, previous_runs: runs });
}

/**
 * Um evento que só pode contar uma vez por análise neste navegador: o relatório
 * aberto de novo amanhã não é uma segunda auditoria concluída.
 */
function firstTime(key: string): boolean {
  const seen = read<string[]>(ONCE_KEY, []);
  if (seen.includes(key)) return false;
  write(ONCE_KEY, [...seen, key].slice(-50));
  return true;
}

/** O resultado apareceu. `onceFor`: o id da análise, quando a mesma tela pode ser reaberta. */
export function toolCompleted(tool: ToolName, props: Props = {}, onceFor: string | null = null): void {
  if (onceFor && !firstTime(`completed:${onceFor}`)) return;
  const runs = read<Record<string, number>>(RUNS_KEY, {});
  write(RUNS_KEY, { ...runs, [tool]: (runs[tool] ?? 0) + 1 });
  captureTool("free_tool_completed", tool, props, onceFor);
}

/** Deu errado. Só o código do erro, nunca a mensagem (pode citar o arquivo). */
export function toolFailed(tool: ToolName, code: string, props: Props = {}, onceFor: string | null = null): void {
  if (onceFor && !firstTime(`failed:${onceFor}`)) return;
  captureTool("free_tool_failed", tool, { ...props, code }, onceFor);
}

/** Saiu da ferramenta em direção ao cadastro ou ao checkout. */
export function rememberToolOrigin(tool: ToolName): void {
  write(ORIGIN_KEY, { tool, at: Date.now() });
}

/** A ferramenta de onde a pessoa veio, se ela saiu de uma nas últimas 24 h. */
export function toolOrigin(): ToolName | null {
  if (typeof window === "undefined") return null;
  const origin = read<{ tool: ToolName; at: number } | null>(ORIGIN_KEY, null);
  return origin && Date.now() - origin.at < ORIGIN_TTL_MS ? origin.tool : null;
}

/** O clique num CTA de produto pago ou de cadastro, com o lugar dele na tela. */
export function upgradeClicked(tool: ToolName, placement: string, props: Props = {}, analysisId: string | null = null): void {
  rememberToolOrigin(tool);
  captureTool("upgrade_cta_clicked", tool, { ...props, placement }, analysisId);
}
