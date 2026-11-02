import { getLocale, getTranslations } from "next-intl/server";
import { Emphasis } from "@/components/landing/Emphasis";
import { PricingCards } from "@/components/PricingCards";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { AppLocale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { PAID_PLANS, PLANS } from "@/lib/pricing";
import { breadcrumbLd, jsonLd, ogImage, ORGANIZATION_ID, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("plans", "/pricing");
}

const BENEFITS = ["second", "phrase", "rewrites", "copilot", "loop", "history"] as const;
const BILLING = ["monthly", "cancel", "currency"] as const;

export default async function PlansPage() {
  const t = await getTranslations("Plans");
  const tSeo = await getTranslations("Seo.plans");
  const tPricing = await getTranslations("Pricing");
  const tCommon = await getTranslations("Common");
  const locale = (await getLocale()) as AppLocale;
  const url = `${SITE_URL}${localePath(locale, "/pricing")}`;
  // os planos como produto, com os preços: é o que o Google mostra quando alguém busca quanto custa
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: SITE_NAME,
      description: tSeo("description"),
      image: `${SITE_URL}${ogImage(locale)}`,
      url,
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: PAID_PLANS.map((plan) => ({
        "@type": "Offer",
        name: tPricing(`plans.${plan.id}.name`),
        price: plan.amount.toFixed(2),
        priceCurrency: plan.currency,
        // as assinaturas cobram por mês
        ...(plan.billing === "monthly"
          ? { priceSpecification: { "@type": "UnitPriceSpecification", price: plan.amount.toFixed(2), priceCurrency: plan.currency, unitCode: "MON", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } } }
          : {}),
        availability: "https://schema.org/InStock",
        url,
        seller: { "@id": ORGANIZATION_ID },
      })),
    },
    breadcrumbLd([
      { name: SITE_NAME, path: localePath(locale, "/") },
      { name: tCommon("plans"), path: localePath(locale, "/pricing") },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <SiteHeader />
      <main className="container-page pb-12 pt-6 lg:pt-8">
        <Reveal eager>
          <p className="chip">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
            {t("chip")}
          </p>
          <h1 className="t-h2 mt-4 max-w-[24ch] text-balance">
            <Emphasis text={t("title")} />
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </Reveal>

        {/* as assinaturas e o grátis */}
        <PricingCards className="mt-6" heading={false} where="plans" />

        {/* o que todo plano pago tem, dito por extenso */}
        <Reveal delay={150} className="mt-10 border-t border-line pt-6">
          <p className="eyebrow">{t("includes")}</p>
          <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
            {BENEFITS.map((key) => (
              <li key={key} className="flex gap-3 border-b border-line py-3 text-[14px] leading-relaxed">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                {t(`benefits.${key}`)}
              </li>
            ))}
            <li className="flex gap-3 border-b border-line py-3 text-[14px] leading-relaxed">
              <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              {t("benefits.limit")}
            </li>
          </ul>
        </Reveal>

        {/* como a cobrança funciona: o que renova, o que não renova, como cancelar */}
        <Reveal delay={150} className="mt-8 border-t border-line pt-6">
          <h2 className="eyebrow">{t("billingTitle")}</h2>
          <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
            {BILLING.map((key) => (
              <li key={key} className="flex gap-3 border-b border-line py-3 text-[14px] leading-relaxed">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                {t(`billing.${key}`, { creator: PLANS.creator.display, pro: PLANS.pro.display, founder: PLANS.founder.display })}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-ink-muted">{t("stripe")}</p>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
