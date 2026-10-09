import { getLocale, getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/PricingCards";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import type { AppLocale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { OFFER } from "@/lib/pricing";
import { breadcrumbLd, jsonLd, ogImage, ORGANIZATION_ID, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("plans", "/planos");
}

const BENEFITS = ["second", "phrase", "rewrites", "copilot", "loop", "history", "oneTime", "updates"] as const;

export default async function PlansPage() {
  const t = await getTranslations("Plans");
  const tSeo = await getTranslations("Seo.plans");
  const tPricing = await getTranslations("Pricing");
  const tCommon = await getTranslations("Common");
  const locale = (await getLocale()) as AppLocale;
  const url = `${SITE_URL}${localePath(locale, "/planos")}`;
  // o plano como produto, com o preço: é o que o Google mostra quando alguém busca quanto custa
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${SITE_NAME} ${tPricing("planName")}`,
      description: tSeo("description"),
      image: `${SITE_URL}${ogImage(locale)}`,
      url,
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: {
        "@type": "Offer",
        price: OFFER.amount.toFixed(2),
        priceCurrency: OFFER.currency,
        availability: "https://schema.org/InStock",
        url,
        seller: { "@id": ORGANIZATION_ID },
      },
    },
    breadcrumbLd([
      { name: SITE_NAME, path: localePath(locale, "/") },
      { name: tCommon("plans"), path: localePath(locale, "/planos") },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="container-page pb-24 pt-12 lg:pt-16">
        <Reveal eager>
          <Badge tone="ink" className="text-[12px]">
            {t("notSubscription")}
          </Badge>
          <h1 className="mt-5 max-w-[20ch] font-display font-semibold text-[37px] leading-[1.05] tracking-[-0.045em] sm:text-[48px]">{t("title")}</h1>
          <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </Reveal>

        {/* o grátis e o Vitalício Fundador, com o contador de vagas — os mesmos cards da landing */}
        <PricingCards className="mt-10" heading={false} where="plans" />

        {/* o que vem nele, dito por extenso */}
        <Reveal delay={150} className="mt-16 border-t border-line pt-10">
          <p className="eyebrow">{t("includes")}</p>
          <ul className="mt-4 grid gap-x-10 sm:grid-cols-2">
            {BENEFITS.map((key) => (
              <li key={key} className="flex gap-4 border-b border-line py-4 text-[15px] leading-relaxed">
                <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                {t(`benefits.${key}`)}
              </li>
            ))}
            <li className="flex gap-4 border-b border-line py-4 text-[15px] leading-relaxed">
              <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              {t("benefits.limit")}
            </li>
          </ul>
          <p className="mt-6 text-[12.5px] text-ink-muted">{t("stripe")}</p>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
