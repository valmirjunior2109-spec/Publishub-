import { captureFirstTouch } from "@/lib/attribution";
import { track } from "@/lib/analytics";
import { REF_CODE_RE, UTM_KEYS, type Utm } from "@/lib/waitlist";

/**
 * O funil da home, do lado do navegador: de onde a pessoa veio (UTM e site de origem)
 * e os eventos (visita, clique num CTA, compartilhamento), gravados no nosso banco e no PostHog.
 */

export interface Attribution {
  utm: Utm;
  referrer: string;
  /** O código de quem indicou (?ref=), se a pessoa chegou por um link de indicação. */
  ref?: string;
}

const STORAGE_KEY = "pu-attribution";
const REF_KEY = "pu-ref";

/**
 * O código de indicação: o da URL, ou o guardado de uma visita anterior (localStorage, 30 dias).
 * Quem chega pelo link de um amigo e só se inscreve dias depois continua contando como indicação.
 */
function referralCode(params: URLSearchParams): string | undefined {
  const fromUrl = params.get("ref")?.trim().toLowerCase();
  try {
    if (fromUrl && REF_CODE_RE.test(fromUrl)) {
      window.localStorage.setItem(REF_KEY, JSON.stringify({ code: fromUrl, at: Date.now() }));
      return fromUrl;
    }
    const stored = JSON.parse(window.localStorage.getItem(REF_KEY) || "null") as { code?: string; at?: number } | null;
    if (stored?.code && REF_CODE_RE.test(stored.code) && Date.now() - (stored.at ?? 0) < 30 * 86400_000) return stored.code;
  } catch {
    // sem armazenamento: vale só o da URL
  }
  return fromUrl && REF_CODE_RE.test(fromUrl) ? fromUrl : undefined;
}
let cached: Attribution | null = null;

/**
 * A primeira origem desta aba: quem chega com UTM, vai para /privacy e volta continua com a UTM.
 * Uma visita nova com UTM substitui a anterior. Sem sessionStorage (aba anônima bloqueada), vale só a URL.
 */
export function attribution(): Attribution {
  if (cached) return cached;
  if (typeof window === "undefined") return { utm: {}, referrer: "" };
  // a primeira origem deste navegador (cookie, gravado uma vez só): lib/attribution.ts
  captureFirstTouch();
  const params = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) utm[key] = value.slice(0, 100);
  }
  const fresh: Attribution = { utm, referrer: document.referrer || "" };
  let stored: Attribution | null = null;
  try {
    stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null") as Attribution | null;
  } catch {
    stored = null;
  }
  cached = { ...(Object.keys(utm).length || !stored?.utm ? fresh : stored), ref: referralCode(params) };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // sem armazenamento: segue com a da URL
  }
  return cached;
}

export type FunnelEvent = "page_view" | "cta_click" | "share_click";

const POSTHOG_NAME: Partial<Record<FunnelEvent, "waitlist_cta_clicked" | "waitlist_share_clicked">> = {
  cta_click: "waitlist_cta_clicked",
  share_click: "waitlist_share_clicked",
};

export function sendFunnelEvent(event: FunnelEvent, detail?: string): void {
  if (typeof window === "undefined") return;
  const { utm, referrer } = attribution();
  const body = JSON.stringify({ event, detail, utm, referrer });
  // sendBeacon sobrevive à troca de página (o clique no X abre outra aba, o link âncora rola)
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/waitlist/event", new Blob([body], { type: "text/plain" }));
  if (!sent) void fetch("/api/waitlist/event", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => undefined);
  const name = POSTHOG_NAME[event];
  if (name) track(name, { detail, ...utm });
}
