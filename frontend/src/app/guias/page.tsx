import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { localeNames, locales } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { guidePath, guidesIn } from "@/lib/guides";
import { breadcrumbLd, buildMetadata, jsonLd, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/seo";

/** Os idiomas que têm pelo menos um guia: só eles entram no hreflang do índice. */
const withGuides = locales.filter((locale) => guidesIn(locale).length > 0);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Seo.guides");
  const locale = await getLocale();
  const metadata = await buildMetadata("/guias", t("title"), t("description"), { locales: withGuides });
  // num idioma sem guias a página é só um aviso: não vale um lugar no Google
  return guidesIn(locale).length > 0 ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

export default async function GuidesPage() {
  const t = await getTranslations("Guides");
  const locale = await getLocale();
  const format = await getFormatter();
  const guides = guidesIn(locale);
  const tSeo = await getTranslations("Seo.guides");
  // a lista para o Google: a página é uma coleção, e cada item é um guia com o endereço dele
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: tSeo("title"),
      description: tSeo("description"),
      url: `${SITE_URL}${localePath(locale, "/guias")}`,
      inLanguage: locale,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: guides.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.title, url: `${SITE_URL}${localePath(locale, guidePath(guide.slug))}` })),
      },
    },
    breadcrumbLd([
      { name: SITE_NAME, path: localePath(locale, "/") },
      { name: t("breadcrumb"), path: localePath(locale, "/guias") },
    ]),
  ];

  return (
    <>
      {guides.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />}
      <SiteHeader />
      <main className="mx-auto max-w-[860px] px-5 pb-24 pt-12 lg:pt-16">
        <Reveal eager>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-3 max-w-[22ch] font-display font-semibold text-[37px] leading-[1.05] tracking-[-0.045em] sm:text-[48px]">{t("title")}</h1>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </Reveal>

        {guides.length === 0 ? (
          <div className="mt-12 rounded-md border border-line bg-paper-raised p-6">
            <p className="text-[15px] leading-relaxed">{t("empty")}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {withGuides.map((other) => (
                <li key={other}>
                  {/* outro idioma: <a>, não <Link>. Carrega a página inteira, senão as
                      partes do navegador ficariam no idioma de antes */}
                  <a href={localePath(other, "/guias")} className="text-[14px]">
                    {t("otherLanguage", { language: localeNames[other] })}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="mt-12 flex flex-col">
            {guides.map((guide) => (
              <li key={guide.slug} className="border-t border-line py-7 last:border-b">
                <Link href={localePath(locale, guidePath(guide.slug))} className="group block hover:no-underline">
                  <h2 className="font-display font-semibold text-[27px] leading-[1.15] text-ink group-hover:text-accent tracking-[-0.03em]">{guide.title}</h2>
                  <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">{guide.description}</p>
                  <p className="mt-3 text-[12.5px] text-ink-muted">
                    {t("minutes", { minutes: guide.minutes })} · {format.dateTime(new Date(`${guide.updated}T12:00:00`), { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
