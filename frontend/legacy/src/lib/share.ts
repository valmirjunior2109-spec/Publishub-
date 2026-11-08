import { API_URL } from "./apiUrl";

/**
 * O resultado público de uma análise (/s/<token>): só a queda, a frase e o porquê.
 * O backend decide o que sai (share_service.public); aqui só se lê.
 */
export interface SharedResult {
  token: string;
  language: string | null;
  retention_source: "insights" | "estimated";
  drop: { at_seconds: number; retained_before: number | null; retained_after: number | null };
  phrase: string;
  diagnosis: string;
  shared_at: string | null;
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{8,32}$/;

export const sharePath = (token: string) => `/s/${token}`;

/** A imagem do cartão: "story" (1080×1920, para os Stories) ou "og" (1200×630, a prévia do link). */
export const cardPath = (token: string, format: "story" | "og", locale: string) => `/s/${token}/card?format=${format}&lang=${encodeURIComponent(locale)}`;

/** No servidor: o resultado compartilhado, ou null se o link não existe (ou foi desligado). */
export async function fetchShared(token: string): Promise<SharedResult | null> {
  if (!TOKEN_RE.test(token)) return null;
  try {
    const response = await fetch(`${API_URL}/api/share/${encodeURIComponent(token)}`, { next: { revalidate: 60 } });
    return response.ok ? ((await response.json()) as SharedResult) : null;
  } catch {
    return null;
  }
}

/** 4.2 → "0:04". */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Os dois números da queda, quando o resultado veio do print do Insights. */
export function retention(result: SharedResult): { before: number; after: number; lost: number } | null {
  const { retained_before: before, retained_after: after } = result.drop;
  if (before == null || after == null || result.retention_source !== "insights") return null;
  return { before: Math.round(before), after: Math.round(after), lost: Math.round(before - after) };
}
