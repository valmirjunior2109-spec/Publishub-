import { ATTRIBUTION_COOKIE, cleanPath, type FirstTouch } from "@/lib/attribution";
import { AI_TOOLS, BUILDING_MAX, PRIORITY_FLOWS, REF_CODE_RE, UTM_KEYS, WAITLIST_FORMS, type AiTool, type PriorityFlow, type Utm, type WaitlistForm } from "@/lib/waitlist";

/**
 * Limpeza do que o navegador manda para a lista de espera: tudo é opcional menos o e-mail,
 * tudo tem tamanho máximo e nada de caracteres de controle.
 */

const CONTROL = /[\u0000-\u001f\u007f]/g;

export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

export function cleanUtm(value: unknown): Utm {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const text = cleanText(source[key], 100);
    if (text) utm[key] = text.toLowerCase();
  }
  return utm;
}

/** Só o domínio de onde a pessoa veio (news.ycombinator.com), sem www; o próprio site não conta. */
export function referrerHost(value: unknown, ownHost: string | null): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (ownHost && host === ownHost.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "")) return null;
    return host.slice(0, 120) || null;
  } catch {
    return null;
  }
}

export function cleanTool(value: unknown): AiTool | null {
  return AI_TOOLS.includes(value as AiTool) ? (value as AiTool) : null;
}

/** A URL do app que a pessoa informou (opcional): só http(s), sem usuário e senha, até 300 caracteres. */
export function cleanAppUrl(value: unknown): string | null {
  const text = cleanText(value, 300);
  if (!text) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || !url.hostname.includes(".")) return null;
    url.hash = "";
    return url.href.slice(0, 300);
  } catch {
    return null;
  }
}

export function cleanFlow(value: unknown): PriorityFlow | null {
  return PRIORITY_FLOWS.includes(value as PriorityFlow) ? (value as PriorityFlow) : null;
}

/** "O que você está construindo", em uma frase: texto simples, até BUILDING_MAX caracteres. */
export function cleanBuilding(value: unknown): string | null {
  return cleanText(value, BUILDING_MAX);
}

/** A página onde a pessoa se inscreveu: só um caminho do próprio site, sem query e sem ids. */
export function cleanConversionPath(value: unknown): string | null {
  const text = cleanText(value, 200);
  if (!text || !text.startsWith("/") || text.startsWith("//")) return null;
  return cleanPath(text.split(/[?#]/)[0] ?? "/");
}

/**
 * A primeira origem (lib/attribution.ts): do cookie publishub_attribution, ou do corpo do pedido quando o
 * navegador bloqueia cookies. Tudo é revalidado aqui; o que não passa vira vazio.
 */
export function cleanFirstTouch(request: Request, bodyValue: unknown, ownHost: string | null): FirstTouch | null {
  let raw: unknown = null;
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const item = part.trim();
    if (item.startsWith(`${ATTRIBUTION_COOKIE}=`)) {
      try {
        raw = JSON.parse(decodeURIComponent(item.slice(ATTRIBUTION_COOKIE.length + 1)));
      } catch {
        raw = null;
      }
    }
  }
  if (!raw || typeof raw !== "object") raw = bodyValue;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const at = typeof value.at === "string" && !Number.isNaN(Date.parse(value.at)) ? new Date(value.at).toISOString() : new Date().toISOString();
  const referrer = typeof value.referrer === "string" && value.referrer ? referrerHost(`https://${value.referrer.replace(/^https?:\/\//, "")}`, ownHost) : null;
  return {
    utm: cleanUtm(value.utm),
    referrer: referrer ?? "",
    landing: cleanConversionPath(value.landing) ?? "/",
    at,
  };
}

export function cleanRef(value: unknown): string | null {
  return typeof value === "string" && REF_CODE_RE.test(value) ? value : null;
}

export function cleanForm(value: unknown): WaitlistForm | null {
  return WAITLIST_FORMS.includes(value as WaitlistForm) ? (value as WaitlistForm) : null;
}

/** O pedido veio de outro site (um formulário falso apontando para cá)? Sem Origin, deixa passar. */
export function crossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (request.headers.get("x-forwarded-host") || request.headers.get("host"));
  } catch {
    return true;
  }
}

/** Lê o corpo como JSON, de fetch ou de sendBeacon (que manda text/plain), com limite de tamanho. */
export async function readJson(request: Request, maxBytes = 4096): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > maxBytes) return null;
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
