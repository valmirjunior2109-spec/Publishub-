import { REF_CODE_RE } from "@/lib/waitlist";
import type { PublicSummary } from "./issues";

/**
 * O resultado compartilhável do teste grátis: só as contagens, nunca a URL completa, prints ou mensagens
 * de erro. É o que vai no link /check/shared e na imagem de prévia dele, então quem vê o post no X ou no
 * LinkedIn descobre o teste grátis sem descobrir nada privado do app.
 *
 * Dois formatos de link convivem: o antigo (?f=&w=&p=, falhas, avisos e aprovadas) e o novo, por tipo de
 * problema (?c=&r=&pg=&o=). O host do app (?app=) só entra quando a própria pessoa escolheu incluir.
 */

export interface ShareCounts {
  fail: number;
  warn: number;
  pass: number;
}

export const SHARED_PATH = "/check/shared";

/** As UTMs do post que a pessoa compartilha a partir do relatório. */
export const SHARE_UTM = { utm_source: "share", utm_medium: "check_report", utm_campaign: "publishub_check" } as const;
/** As UTMs dos CTAs da página pública /check/shared (quem chegou pelo post de outra pessoa). */
export const SHARED_REPORT_UTM = { utm_source: "shared_report", utm_medium: "check_report", utm_campaign: "publishub_check" } as const;

const MAX = 99;
/** Só um nome de host comum (meuapp.vercel.app): nada de caminho, query, porta ou usuário. */
const HOST_RE = /^(?=.{3,120}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function getter(params: Params) {
  return (key: string) => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key];
    return Array.isArray(value) ? value[0] : (value ?? undefined);
  };
}

function count(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? Math.min(MAX, Math.max(0, n)) : 0;
}

/** Lê ?f=&w=&p= (valores ruins viram 0, nada passa de 99). */
export function parseShareCounts(params: Params): ShareCounts {
  const get = getter(params);
  return { fail: count(get("f")), warn: count(get("w")), pass: count(get("p")) };
}

export function shareQuery(counts: ShareCounts): URLSearchParams {
  return new URLSearchParams({ f: String(counts.fail), w: String(counts.warn), p: String(counts.pass) });
}

/** O resumo por tipo, se o link é do formato novo; null num link antigo. */
export function parsePublicSummary(params: Params): PublicSummary | null {
  const get = getter(params);
  if (get("c") === undefined && get("r") === undefined && get("pg") === undefined) return null;
  return { crash: count(get("c")), request: count(get("r")), page: count(get("pg")), other: count(get("o")) };
}

export function summaryQuery(summary: PublicSummary): URLSearchParams {
  return new URLSearchParams({ c: String(summary.crash), r: String(summary.request), pg: String(summary.page), o: String(summary.other) });
}

/** O host do app no link compartilhado, só se for um host válido. */
export function parseSharedHost(params: Params): string | null {
  const value = getter(params)("app")?.trim().toLowerCase();
  return value && HOST_RE.test(value) ? value : null;
}

/**
 * O link do post: o resumo, as UTMs de compartilhamento (com a rede em utm_content), o código de
 * indicação de quem compartilha (se já está na lista) e, só se a pessoa pediu, o host do app.
 */
export function sharedSummaryUrl(siteUrl: string, summary: PublicSummary, network: string, options: { refCode?: string | null; appHost?: string | null; locale?: "en" | "pt" } = {}): string {
  const query = summaryQuery(summary);
  if (options.locale === "pt") query.set("l", "pt");
  if (options.appHost && HOST_RE.test(options.appHost)) query.set("app", options.appHost);
  for (const [key, value] of Object.entries(SHARE_UTM)) query.set(key, value);
  query.set("utm_content", network);
  if (options.refCode && REF_CODE_RE.test(options.refCode)) query.set("ref", options.refCode);
  return `${siteUrl}${SHARED_PATH}?${query}`;
}

/** Um link do site com as UTMs dadas (para os CTAs). */
export function withUtm(path: string, utm: Record<string, string>, content?: string): string {
  const [base, hash] = path.split("#");
  const [pathname, search] = (base ?? "").split("?");
  const query = new URLSearchParams(search);
  for (const [key, value] of Object.entries(utm)) query.set(key, value);
  if (content) query.set("utm_content", content);
  return `${pathname}?${query}${hash ? `#${hash}` : ""}`;
}

export function shareHeadline({ fail, warn }: ShareCounts): string {
  if (fail) return `${fail} problem${fail === 1 ? "" : "s"} found`;
  if (warn) return `Working, with ${warn} warning${warn === 1 ? "" : "s"}`;
  return "No problems found";
}
