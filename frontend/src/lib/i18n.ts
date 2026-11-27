/**
 * Os dois idiomas do site. O inglês fica nos endereços de sempre (/, /check), porque o CLI do StillWorks,
 * os posts e o Google já apontam para eles; o português vive em /pt (/pt, /pt/check, /pt/check/[id]).
 * Só a home, o teste grátis e o Founding Customers têm versão em português; guias, termos e privacidade continuam em inglês.
 */

export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

/** O atributo lang de cada idioma. */
export const HTML_LANG: Record<Locale, string> = { en: "en-US", pt: "pt-BR" };

/** O código do Intl para datas e números. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", pt: "pt-BR" };

/** O prefixo das rotas: "" no inglês, "/pt" no português. */
export const PREFIX: Record<Locale, string> = { en: "", pt: "/pt" };

/** "/check" → "/pt/check" no português; âncoras e a home também ("/#pricing" → "/pt#pricing"). */
export function localePath(locale: Locale, path: string): string {
  if (locale === "en") return path;
  if (path === "/") return "/pt";
  if (path.startsWith("/#")) return `/pt${path.slice(1)}`;
  return `/pt${path}`;
}

/** As páginas que existem nos dois idiomas. */
function hasTwin(path: string): boolean {
  return path === "/" || path === "/check" || path === "/founding" || /^\/check\/[0-9a-f-]{36}$/i.test(path);
}

/** O idioma de um caminho e o mesmo caminho no outro idioma (sem par, vai para a home do outro idioma). */
export function localeOf(pathname: string): { locale: Locale; base: string } {
  if (pathname === "/pt" || pathname.startsWith("/pt/")) return { locale: "pt", base: pathname.slice(3) || "/" };
  return { locale: "en", base: pathname };
}

export function counterpart(pathname: string): string {
  const { locale, base } = localeOf(pathname);
  const target: Locale = locale === "en" ? "pt" : "en";
  return localePath(target, hasTwin(base) ? base : "/");
}

/**
 * As mensagens de erro das rotas da API vêm em inglês; no português, o navegador troca pelo código.
 * Sem tradução para o código, mostra a mensagem original.
 */
const API_ERRORS_PT: Record<string, string> = {
  INVALID_EMAIL: "Digite um e-mail válido, como voce@empresa.com.",
  TOO_FAST: "Foi rápido demais. Espere um segundo e tente de novo.",
  REJECTED: "Não conseguimos enviar. Tente de novo.",
  RATE_LIMITED: "Muitas tentativas desta rede. Tente de novo mais tarde.",
  BUSY: "Muita gente testando apps agora. Tente de novo em alguns minutos.",
  NOT_CONFIGURED: "Isso não está disponível agora. Tente de novo mais tarde.",
  INVALID_URL: "Digite um endereço público válido, como meuapp.vercel.app.",
  INVALID_VERDICT: "Escolha o que você achou da proposta.",
  INVALID_MESSAGE: "Conte o que você acha em uma ou duas frases.",
  FEEDBACK_ERROR: "Não conseguimos enviar seu feedback. Mande um e-mail para nós.",
  WAITLIST_ERROR: "Não conseguimos salvar seu e-mail. Tente de novo.",
  CHECK_ERROR: "Não conseguimos começar o teste. Tente de novo.",
  CHECKOUT_ERROR: "O pagamento não está disponível agora. Tente de novo em instantes.",
  PRICE_NOT_RECURRING: "O pagamento não está disponível agora.",
  CONTEXT_ERROR: "Não conseguimos salvar suas respostas. Tente de novo mais tarde.",
  FORBIDDEN: "Não permitido.",
  BAD_REQUEST: "Algo deu errado. Tente de novo.",
};

export function apiError(locale: Locale, error: { message?: string; code?: string } | undefined, fallback: string): string {
  if (locale === "pt") return (error?.code && API_ERRORS_PT[error.code]) || fallback;
  return error?.message || fallback;
}
