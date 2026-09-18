/**
 * Publishub Partners no navegador: quem chega por /?ref=CODE guarda o código num
 * cookie de um ano; ao entrar numa conta nova, o AppShell manda o código ao backend
 * (que aplica as regras) e apaga o cookie.
 */
export const REFERRAL_COOKIE = "ph_ref";
/** Códigos cujo clique já foi contado neste navegador (para não contar recarregamentos). */
const VISITED_KEY = "ph_ref_visited";
const CODE_RE = /^[A-Za-z0-9]{6,12}$/;

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
