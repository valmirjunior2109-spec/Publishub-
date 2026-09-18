/**
 * Publishub Partners no navegador: quem chega por /?ref=CODE guarda o código num
 * cookie de um ano; ao entrar numa conta nova, o AppShell manda o código ao backend
 * (que aplica as regras) e só então apaga o cookie.
 *
 * O código também vai junto no cadastro (user_metadata.ref_code): se a pessoa confirmar
 * o e-mail em outro navegador ou no celular, o cookie não existe lá, mas a indicação sim.
 */
export const REFERRAL_COOKIE = "ph_ref";
const CODE_RE = /^[A-Za-z0-9]{6,12}$/;
/** Chave do código em user_metadata, gravado pelo cadastro. */
export const REFERRAL_META_KEY = "ref_code";
/** Igual a NEW_ACCOUNT_WINDOW no backend: depois disso a conta não pode mais ser indicada. */
const NEW_ACCOUNT_DAYS = 7;

/**
 * Se a URL tem ?ref=CODE, guarda o código (o primeiro link vale: um segundo link não troca
 * quem indicou). Devolve o código só quando ele foi guardado agora, para o clique contar uma
 * vez por navegador; devolve null se já havia um código ou se o cookie não pôde ser gravado.
 */
export function captureReferralFromUrl(): string | null {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code || !CODE_RE.test(code) || readReferralCookie()) return null;
    const normalized = code.toUpperCase();
    document.cookie = `${REFERRAL_COOKIE}=${normalized}; max-age=31536000; path=/; SameSite=Lax`;
    return readReferralCookie() === normalized ? normalized : null;
  } catch {
    return null; // sem cookies (modo privado restrito): a indicação simplesmente não é registrada
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

const settledKey = (userId: string) => `ph_ref_settled:${userId}`;

interface ReferralUser {
  id: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
}

/** O código que esta conta ainda precisa enviar ao backend: o cookie ou, na falta dele, o do cadastro. */
export function pendingReferral(user: ReferralUser): string | null {
  const cookie = readReferralCookie();
  if (cookie) return cookie;

  const fromSignup = user.user_metadata?.[REFERRAL_META_KEY];
  if (typeof fromSignup !== "string" || !CODE_RE.test(fromSignup)) return null;
  const created = user.created_at ? Date.parse(user.created_at) : NaN;
  if (!Number.isNaN(created) && Date.now() - created > NEW_ACCOUNT_DAYS * 86_400_000) return null;
  try {
    if (localStorage.getItem(settledKey(user.id))) return null;
  } catch {
    // sem localStorage: o backend responde "already" nas chamadas seguintes
  }
  return fromSignup.toUpperCase();
}

/** O backend já decidiu sobre a indicação desta conta: para de enviar o código. */
export function settleReferral(userId: string): void {
  clearReferralCookie();
  try {
    localStorage.setItem(settledKey(userId), "1");
  } catch {
    // idem
  }
}

export function referralLink(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
}
