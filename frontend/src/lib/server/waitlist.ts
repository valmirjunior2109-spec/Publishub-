import { AI_TOOLS, UTM_KEYS, WAITLIST_FORMS, type AiTool, type Utm, type WaitlistForm } from "@/lib/waitlist";

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
