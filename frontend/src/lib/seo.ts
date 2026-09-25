import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { locales, type AppLocale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

/** O endereço público do site. Configurável para preview e para trocar de domínio sem mexer no código. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.getpublishub.com").replace(/\/+$/, "");

export const SITE_NAME = "Publishub";

/** O código que o Open Graph espera (pt_BR, não pt-BR). */
const OG_LOCALE: Record<AppLocale, string> = { "pt-BR": "pt_BR", en: "en_US", es: "es_ES" };

/** As páginas públicas que têm título e descrição próprios em `Seo`. */
export type SeoPage = "home" | "plans" | "try" | "guides" | "partners" | "terms" | "privacy";

/**
 * As tags hreflang de `path`: uma por idioma, mais o x-default (o endereço sem
 * prefixo, que se adapta ao navegador de quem chega).
 *
 * `only` limita aos idiomas em que a página existe (um guia escrito só em português).
 */
export function languageAlternates(path: string, only: readonly AppLocale[] = locales): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of only) alternates[locale] = localePath(locale, path);
  if (only.includes("en")) alternates["x-default"] = path;
  return alternates;
}

interface MetadataOptions {
  /** Idiomas em que esta página existe; o padrão são todos. */
  locales?: readonly AppLocale[];
  /** Tipo do Open Graph: "article" para os guias. */
  type?: "website" | "article";
}

/**
 * Título, descrição, canonical, hreflang, Open Graph e Twitter de uma página,
 * no idioma em que ela está sendo servida.
 *
 * O canonical aponta para o endereço do idioma (/pt/planos para quem vê em
 * português), para o Google nunca juntar as três versões numa só.
 */
export async function buildMetadata(path: string, title: string, description: string, options: MetadataOptions = {}): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const available = options.locales ?? locales;
  const url = localePath(locale, path);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: languageAlternates(path, available) },
    openGraph: {
      type: options.type ?? "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: available.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{ url: `/og?lang=${locale}`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/og?lang=${locale}`] },
  };
}

/** Os metadados de uma página pública, com o texto de `Seo.<page>` no idioma da requisição. */
export async function pageMetadata(page: SeoPage, path: string): Promise<Metadata> {
  const t = await getTranslations(`Seo.${page}`);
  return buildMetadata(path, t("title"), t("description"));
}

/** Páginas de conta e de app: fora do Google, mas os links nelas continuam sendo seguidos. */
export const PRIVATE_METADATA: Metadata = {
  robots: { index: false, follow: true },
};

/** O JSON-LD dentro de uma <script>: sem `<` cru, para ninguém fechar a tag com um texto. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
