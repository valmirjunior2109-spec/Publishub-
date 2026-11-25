import { REF_CODE_RE } from "@/lib/waitlist";

/**
 * O resultado compartilhável do teste grátis: só as contagens (falhas, avisos, aprovadas), nunca a URL
 * nem o nome do app. É o que vai no link /check/shared e na imagem de prévia dele, então quem vê o post
 * no X ou no LinkedIn descobre o teste grátis sem descobrir de quem é o app.
 */

export interface ShareCounts {
  fail: number;
  warn: number;
  pass: number;
}

export const SHARED_PATH = "/check/shared";

const MAX = 99;

function count(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? Math.min(MAX, Math.max(0, n)) : 0;
}

/** Lê ?f=&w=&p= (valores ruins viram 0, nada passa de 99). */
export function parseShareCounts(params: Record<string, string | string[] | undefined> | URLSearchParams): ShareCounts {
  const get = (key: string) => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key];
    return Array.isArray(value) ? value[0] : (value ?? undefined);
  };
  return { fail: count(get("f")), warn: count(get("w")), pass: count(get("p")) };
}

export function shareQuery(counts: ShareCounts): URLSearchParams {
  return new URLSearchParams({ f: String(counts.fail), w: String(counts.warn), p: String(counts.pass) });
}

/** O endereço que vai no post: as contagens, a UTM da rede e, se a pessoa já está na lista, o código de indicação dela. */
export function sharedUrl(siteUrl: string, counts: ShareCounts, network: string, refCode?: string | null): string {
  const query = shareQuery(counts);
  query.set("utm_source", network);
  query.set("utm_medium", "social");
  query.set("utm_campaign", "check_share");
  if (refCode && REF_CODE_RE.test(refCode)) query.set("ref", refCode);
  return `${siteUrl}${SHARED_PATH}?${query}`;
}

export function shareHeadline({ fail, warn }: ShareCounts): string {
  if (fail) return `${fail} problem${fail === 1 ? "" : "s"} found`;
  if (warn) return `Working, with ${warn} warning${warn === 1 ? "" : "s"}`;
  return "No problems found";
}

/** O texto do post, em primeira pessoa (quem compartilha é o dono do app). */
export function shareText({ fail, warn }: ShareCounts): string {
  if (fail || warn) {
    return `I ran a free real-browser check on my AI-built app: ${fail} failure${fail === 1 ? "" : "s"}, ${warn} warning${warn === 1 ? "" : "s"}. Found before my users did. Check yours (free):`;
  }
  return "My AI-built app passed a free real-browser check: no crashes, no failed requests, no broken pages. Check yours (free):";
}
