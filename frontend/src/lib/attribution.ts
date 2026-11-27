import { UTM_KEYS, type Utm } from "@/lib/waitlist";

/**
 * A primeira origem de cada visitante (first-touch), num cookie first-party: de qual campanha (UTM) e de
 * qual site a pessoa chegou na primeira vez, e em que página entrou. Complementa a origem da aba atual
 * (lib/funnel.ts, last-touch), que já vai nas colunas utm_* da lista de espera.
 *
 * - O cookie é gravado uma vez e nunca é sobrescrito (nem por uma visita "direta" depois).
 * - Só guarda o domínio do site de origem, nunca a URL completa de onde a pessoa veio.
 * - Serve só para analytics e segmentação: o servidor valida tudo e nunca decide nada sensível com isso.
 */

export const ATTRIBUTION_COOKIE = "publishub_attribution";
const MAX_AGE_DAYS = 90;

export interface FirstTouch {
  utm: Utm;
  /** O domínio do site de onde a pessoa veio (news.ycombinator.com), sem www. Vazio quando direto. */
  referrer: string;
  /** O caminho da primeira página (/check, /pt), sem query. */
  landing: string;
  /** Quando (ISO). */
  at: string;
}

const UUID_IN_PATH = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** O caminho sem ids de relatório (/check/[id]): o que importa é o tipo de página. */
export function cleanPath(pathname: string): string {
  return pathname.replace(UUID_IN_PATH, "[id]").slice(0, 200) || "/";
}

/** As UTMs da URL atual (só as conhecidas, até 100 caracteres cada). */
export function utmFromUrl(search: string): Utm {
  const params = new URLSearchParams(search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) utm[key] = value.slice(0, 100);
  }
  return utm;
}

/** Só o domínio do referrer, se for de outro site. */
export function referrerDomain(referrer: string, ownHost: string): string {
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host === ownHost.toLowerCase().replace(/^www\./, "") ? "" : host.slice(0, 120);
  } catch {
    return "";
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const item = part.trim();
    if (item.startsWith(prefix)) return item.slice(prefix.length);
  }
  return null;
}

/** A primeira origem gravada neste navegador, ou null. */
export function readFirstTouch(): FirstTouch | null {
  if (typeof document === "undefined") return null;
  try {
    const raw = readCookie(ATTRIBUTION_COOKIE);
    if (!raw) return null;
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<FirstTouch>;
    return value && typeof value === "object" ? { utm: value.utm ?? {}, referrer: value.referrer ?? "", landing: value.landing ?? "/", at: value.at ?? "" } : null;
  } catch {
    return null;
  }
}

/**
 * Grava a primeira origem, se ainda não existe. Chamada em toda visita (WaitlistTracker), mas só a
 * primeira grava: uma visita depois, com ou sem UTM, não muda o que já está lá.
 */
export function captureFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  const existing = readFirstTouch();
  if (existing) return existing;
  const touch: FirstTouch = {
    utm: utmFromUrl(window.location.search),
    referrer: referrerDomain(document.referrer, window.location.hostname),
    landing: cleanPath(window.location.pathname),
    at: new Date().toISOString(),
  };
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(touch))}; Max-Age=${MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // cookies bloqueados: a inscrição segue só com a origem da aba
  }
  return touch;
}

/** O que a inscrição leva além da origem da aba: a primeira origem e a página onde a pessoa se inscreveu. */
export function conversionContext(): { firstTouch: FirstTouch | null; conversionPath: string } {
  if (typeof window === "undefined") return { firstTouch: null, conversionPath: "/" };
  return { firstTouch: captureFirstTouch(), conversionPath: cleanPath(window.location.pathname) };
}
