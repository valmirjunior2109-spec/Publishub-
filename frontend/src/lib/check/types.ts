/**
 * O formato do teste grátis (/check), dividido entre o servidor (que roda o teste) e o navegador
 * (que mostra o relatório). Nada de import do Node aqui.
 */

export type CheckStatus = "queued" | "running" | "done" | "failed";
export type Verdict = "pass" | "warn" | "fail" | "skip";

export interface CheckItem {
  id: CheckId;
  label: string;
  verdict: Verdict;
  /** Uma frase sobre o resultado. */
  detail: string;
  /** Até alguns exemplos (mensagens de erro, URLs que falharam). */
  items?: string[];
}

export type CheckId = "loads" | "https" | "js_errors" | "console" | "network" | "links" | "pages" | "mobile" | "speed" | "preview";

export interface VisitedPage {
  url: string;
  /** Como a página entrou no teste: a URL colada ou um link encontrado nela. */
  kind: "start" | "linked";
  status: number | null;
  loadMs: number | null;
  jsErrors: number;
  notFound: boolean;
  error?: string;
}

export interface CheckResult {
  finalUrl: string;
  summary: { pass: number; warn: number; fail: number };
  checks: CheckItem[];
  pages: VisitedPage[];
  meta: { title: string | null; description: string | null; durationMs: number };
}

export interface CheckScreenshots {
  desktop?: string;
  mobile?: string;
}

/** O que GET /api/check/[id] devolve. */
export interface CheckReport {
  id: string;
  url: string;
  status: CheckStatus;
  createdAt: string;
  error: string | null;
  result: CheckResult | null;
  screenshots: CheckScreenshots | null;
}

export const CHECK_LIMIT_PER_HOUR = 5;
