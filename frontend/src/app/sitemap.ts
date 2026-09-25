import type { MetadataRoute } from "next";
import { locales, type AppLocale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { GUIDES, guidePath, guidesIn } from "@/lib/guides";
import { languageAlternates, SITE_URL } from "@/lib/seo";

const absolute = (path: string) => SITE_URL + (path === "/" ? "" : path);

function withAlternates(path: string, available: readonly AppLocale[]): Record<string, string> {
  return Object.fromEntries(Object.entries(languageAlternates(path, available)).map(([lang, href]) => [lang, absolute(href)]));
}

/** As páginas públicas nos três idiomas, e os guias nos idiomas em que foram escritos. */
const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/experimentar", priority: 0.9, changeFrequency: "monthly" },
  { path: "/planos", priority: 0.8, changeFrequency: "monthly" },
  { path: "/partners", priority: 0.5, changeFrequency: "monthly" },
  { path: "/termos", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacidade", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // cada versão entra com o conjunto inteiro de alternativas, como o Google pede
  for (const page of PAGES) {
    for (const locale of locales) {
      entries.push({
        url: absolute(localePath(locale, page.path)),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages: withAlternates(page.path, locales) },
      });
    }
  }

  // o índice dos guias só existe nos idiomas que têm algum guia
  const guideLocales = locales.filter((locale) => guidesIn(locale).length > 0);
  for (const locale of guideLocales) {
    entries.push({ url: absolute(localePath(locale, "/guias")), changeFrequency: "weekly", priority: 0.7, alternates: { languages: withAlternates("/guias", guideLocales) } });
  }

  for (const guide of GUIDES) {
    entries.push({
      url: absolute(localePath(guide.locale, guidePath(guide.slug))),
      lastModified: guide.updated,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: withAlternates(guidePath(guide.slug), [guide.locale]) },
    });
  }

  return entries;
}
