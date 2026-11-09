import { track } from "@/lib/analytics";
import { UTM_KEYS, type Utm } from "@/lib/waitlist";

/**
 * O funil da página /verify, do lado do navegador: de onde a pessoa veio (UTM e site de origem)
 * e os eventos (visita, clique num CTA, compartilhamento), gravados no nosso banco e no PostHog.
 */

export interface Attribution {
  utm: Utm;
  referrer: string;
}

const STORAGE_KEY = "pu-attribution";
let cached: Attribution | null = null;

/**
 * A primeira origem desta aba: quem chega com UTM, vai para /privacy e volta continua com a UTM.
 * Uma visita nova com UTM substitui a anterior. Sem sessionStorage (aba anônima bloqueada), vale só a URL.
 */
export function attribution(): Attribution {
  if (cached) return cached;
  if (typeof window === "undefined") return { utm: {}, referrer: "" };
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
  cached = Object.keys(utm).length || !stored?.utm ? fresh : stored;
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
