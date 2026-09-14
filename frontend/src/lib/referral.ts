/**
 * Publishub Partners no navegador: quem chega por /?ref=CODE guarda o código num
 * cookie de um ano; ao entrar numa conta nova, o AppShell manda o código ao backend
 * (que aplica as regras) e apaga o cookie.
 */
export const REFERRAL_COOKIE = "ph_ref";
const CODE_RE = /^[A-Za-z0-9]{6,12}$/;

export function captureReferralFromUrl(): void {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && CODE_RE.test(code) && !readReferralCookie()) {
      document.cookie = `${REFERRAL_COOKIE}=${code.toUpperCase()}; max-age=31536000; path=/; SameSite=Lax`;
    }
  } catch {
    // sem cookies (modo privado restrito): a indicação simplesmente não é registrada
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
