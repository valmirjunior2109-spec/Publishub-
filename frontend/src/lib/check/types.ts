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

/** Os nomes das verificações em linguagem simples (os números agregados e o relatório). */
export const CHECK_LABELS: Record<CheckId, string> = {
  loads: "the page didn't load",
  https: "not served over HTTPS",
  js_errors: "JavaScript crashes",
  console: "console errors",
  network: "failed requests to the app or its API",
  links: "broken internal links",
  pages: "a key page that didn't open",
  mobile: "layout broken on phones",
  speed: "slow loading",
  preview: "missing link previews",
};

/** O que GET /api/check/stats devolve: só contagens, nada que identifique um app. */
export interface CheckStats {
  checked: number;
  withFailure: number;
  topFailure: { id: CheckId; count: number } | null;
}

/** Abaixo disso, os números não aparecem no site (amostra pequena demais para dizer algo). */
export const STATS_MIN_CHECKS = 25;

/** Onde o navegador de quem criou o teste guarda o token para apagar o relatório. */
export const deleteTokenKey = (id: string) => `pu-check-${id}`;
