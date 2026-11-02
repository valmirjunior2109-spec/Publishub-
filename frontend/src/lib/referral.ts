/**
 * Publishub Partners no navegador: quem chega por /?ref=CODE guarda o código num
 * cookie de um ano; ao entrar numa conta nova, o AppShell manda o código ao backend
 * (que aplica as regras) e apaga o cookie.
 */
export const REFERRAL_COOKIE = "ph_ref";
/** Códigos cujo clique já foi contado neste navegador (para não contar recarregamentos). */
const VISITED_KEY = "ph_ref_visited";
// A mesma forma do ANY_CODE_RE do backend: o código sorteado e os personalizados
// (/?ref=maria-fit). Mais estreita que isso, o link que o Partner escolheu se perde aqui.
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,23}$/;

export function captureReferralFromUrl(): string | null {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code || !CODE_RE.test(code)) return null;
    if (!readReferralCookie()) {
      document.cookie = `${REFERRAL_COOKIE}=${code.toUpperCase()}; max-age=31536000; path=/; SameSite=Lax`;
    }
    return code.toUpperCase();
  } catch {
    // sem cookies (modo privado restrito): a indicação simplesmente não é registrada
    return null;
  }
}

/**
 * Diz se este clique ainda não foi contado neste navegador. O backend só aceita
 * códigos que existem; recarregar a página não inventa cliques novos.
 */
export function markVisited(code: string): boolean {
  try {
    const seen = (window.localStorage.getItem(VISITED_KEY) || "").split(",").filter(Boolean);
    if (seen.includes(code)) return false;
    window.localStorage.setItem(VISITED_KEY, [...seen, code].join(","));
    return true;
  } catch {
    return false; // sem localStorage: não conta o clique, o resto do fluxo continua
  }
}

export function readReferralCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function clearReferralCookie(): void {
  try {
    document.cookie = `${REFERRAL_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
  } catch {
    // idem
  }
}

export function referralLink(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
}

/**
 * Um link do site para compartilhar: utm_source=share (o first_source de quem chega)
 * e, com conta, o ?ref= de quem compartilhou, que o ReferralCapture lê em qualquer página.
 */
export function shareLink(path: string, medium: string, campaign: string, code: string | null): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  if (code) url.searchParams.set("ref", code);
  return url.toString();
}
