import { type AppLocale, defaultLocale, isLocale } from "./config";

/**
 * Uma URL por idioma, para o Google.
 *
 * O site continua sem pastas por idioma: o proxy (src/proxy.ts) recebe /pt/planos,
 * serve a página /planos e avisa, por este header, que ela sai em português. O
 * inglês fica sem prefixo (/planos), porque é o que o Googlebot recebe sem
 * Accept-Language. Assim cada versão tem um endereço próprio para indexar e
 * apontar nas tags hreflang.
 *
 * Nada aqui importa next-intl/server: o proxy roda antes da renderização e só
 * pode depender de código puro.
 */
export const LOCALE_HEADER = "x-publishub-locale";

export const LOCALE_PREFIX: Record<AppLocale, string> = { en: "", "pt-BR": "/pt", es: "/es" };

const PREFIX_TO_LOCALE: Record<string, AppLocale> = { pt: "pt-BR", es: "es" };

/** "/pt/planos" → { locale: "pt-BR", path: "/planos" }; "/planos" → { locale: null, path: "/planos" }. */
export function splitLocalePath(pathname: string): { locale: AppLocale | null; path: string } {
  const match = /^\/(pt|es)(\/.*)?$/.exec(pathname);
  if (!match) return { locale: null, path: pathname || "/" };
  return { locale: PREFIX_TO_LOCALE[match[1]], path: match[2] || "/" };
}

/** O endereço de `path` no idioma: localePath("pt-BR", "/planos") → "/pt/planos". */
export function localePath(locale: string, path: string): string {
  const prefix = isLocale(locale) ? LOCALE_PREFIX[locale] : LOCALE_PREFIX[defaultLocale];
  if (path === "/") return prefix || "/";
  return prefix + path;
}

/**
 * As páginas que existem para quem ainda não tem conta, e por isso para o Google.
 * O resto (painel, análises, conta) fica fora do sitemap e marcado noindex.
 */
export const PUBLIC_PATHS = ["/", "/planos", "/experimentar", "/guias", "/partners", "/termos", "/privacidade"] as const;

export function isPublicPath(path: string): boolean {
  return (PUBLIC_PATHS as readonly string[]).includes(path) || path.startsWith("/guias/");
}
