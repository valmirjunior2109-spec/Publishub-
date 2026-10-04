import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { findGuide, guideLanguages, guidePath, relatedGuides, translationsOf, type GuideBlock } from "@/lib/guides";
import { buildMetadata, jsonLd, ogImage, SITE_NAME, SITE_URL } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = findGuide((await params).slug);
  if (!guide) return {};
  const metadata = await buildMetadata(guidePath(guide.slug), guide.title, guide.description, {
    locales: translationsOf(guide).map((translation) => translation.locale),
    languages: guideLanguages(guide),
    type: "article",
  });
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, type: "article", publishedTime: guide.published, modifiedTime: guide.updated },
  };
}

function Block({ block, ctaHref, ctaLabel }: { block: GuideBlock; ctaHref: string; ctaLabel: string }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-12 font-serif text-[30px] font-normal leading-[1.15]">{block.text}</h2>;
    case "p":
      return <p className="mt-5 text-[16.5px] leading-[1.75]">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-5 flex list-disc flex-col gap-2.5 pl-5 text-[16.5px] leading-[1.7] marker:text-ink-muted">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-5 flex list-decimal flex-col gap-2.5 pl-5 text-[16.5px] leading-[1.7] marker:font-display marker:text-ink-muted">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "example":
      return <blockquote className="t-quote mt-7 border-l-[3px] border-accent pl-5">{block.text}</blockquote>;
    case "cta":
      return (
        <aside className="mt-14 rounded-md border border-line bg-paper-raised p-7">
          <p className="text-[16px] leading-relaxed">{block.text}</p>
          <Link href={ctaHref} className={buttonClasses("primary", "md", "mt-5 px-6 py-3")}>
            {ctaLabel}
          </Link>
        </aside>
      );
  }
}

/** Um guia: texto corrido, com o convite para testar no próprio vídeo no fim. */
export default async function GuidePage({ params }: Props) {
  const guide = findGuide((await params).slug);
  if (!guide) notFound();

  // cada guia tem um idioma só: quem chega por outro endereço vai para o dele
  const locale = await getLocale();
  if (locale !== guide.locale) permanentRedirect(localePath(guide.locale, guidePath(guide.slug)));

  const t = await getTranslations("Guides");
  const format = await getFormatter();
  const related = relatedGuides(guide);
  const url = `${SITE_URL}${localePath(guide.locale, guidePath(guide.slug))}`;
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      inLanguage: guide.locale,
      datePublished: guide.published,
      dateModified: guide.updated,
      mainEntityOfPage: url,
      image: `${SITE_URL}${ogImage(guide.locale)}`,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}${localePath(guide.locale, "/")}` },
        { "@type": "ListItem", position: 2, name: t("breadcrumb"), item: `${SITE_URL}${localePath(guide.locale, "/guias")}` },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="mx-auto max-w-[720px] px-5 pb-24 pt-10 lg:pt-14">
        <nav aria-label="breadcrumb" className="text-[12px] uppercase tracking-[0.05em] text-ink-muted">
          <Link href={localePath(guide.locale, "/guias")} className="text-ink-muted hover:text-ink hover:no-underline">
            {t("breadcrumb")}
          </Link>
        </nav>
        <article>
          <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.01em] text-balance sm:text-[52px]">{guide.title}</h1>
          <p className="mt-4 text-[13px] text-ink-muted">
            {t("minutes", { minutes: guide.minutes })} ·{" "}
            <time dateTime={guide.updated}>{t("updated", { date: format.dateTime(new Date(`${guide.updated}T12:00:00`), { day: "numeric", month: "long", year: "numeric" }) })}</time>
          </p>
          {guide.blocks.map((block, index) => (
            <Block key={index} block={block} ctaHref={localePath(guide.locale, "/experimentar")} ctaLabel={t("cta")} />
          ))}
        </article>
        {/* os outros guias: quem chegou pelo Google num deles tem para onde ir, e o Google também */}
        {related.length > 0 && (
          <nav aria-label={t("related")} className="mt-14 border-t border-line pt-8">
            <h2 className="eyebrow">{t("related")}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {related.map((other) => (
                <li key={other.slug}>
                  <Link href={localePath(other.locale, guidePath(other.slug))} className="text-[16px] font-medium">
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <p className="mt-10 border-t border-line pt-6">
          <Link href={localePath(guide.locale, "/guias")} className="text-[14px]">
            {t("all")}
          </Link>
        </p>
      </main>
    </>
  );
}
