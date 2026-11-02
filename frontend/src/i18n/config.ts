export const locales = ["en", "pt-BR", "es", "fr", "de", "it", "hi", "id", "tr", "ja", "ko"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

/** Cookie que guarda a escolha manual do seletor; é o único jeito de sair do inglês. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** O nome de cada idioma é escrito nele mesmo, por isso não passa pelas mensagens. */
export const localeNames: Record<AppLocale, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  hi: "हिन्दी",
  id: "Bahasa Indonesia",
  tr: "Türkçe",
  ja: "日本語",
  ko: "한국어",
};

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Lê o header Accept-Language ("pt-BR,pt;q=0.9,en;q=0.8") em ordem de
 * preferência e devolve o primeiro idioma que suportamos.
 */
export function detectLocale(acceptLanguage: string | null | undefined): AppLocale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of ranked) {
    if (tag.startsWith("pt")) return "pt-BR";
    if (tag.startsWith("en")) return "en";
    // "in" é o código antigo do indonésio, que alguns Androids ainda mandam
    if (tag === "in" || tag.startsWith("in-")) return "id";
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
