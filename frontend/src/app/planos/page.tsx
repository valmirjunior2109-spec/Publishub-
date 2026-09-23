import { getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/PricingCards";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";

const BENEFITS = ["second", "phrase", "rewrites", "copilot", "loop", "history", "oneTime", "updates"] as const;

export default async function PlansPage() {
  const t = await getTranslations("Plans");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 pb-24 pt-12 lg:px-16 lg:pt-16">
        <Reveal>
          <Badge tone="ink" className="text-[12px]">
            {t("notSubscription")}
          </Badge>
          <h1 className="mt-5 max-w-[20ch] font-display text-[34px] font-medium leading-tight tracking-tight sm:text-[42px]">{t("title")}</h1>
          <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </Reveal>

        {/* os dois planos, com a comparação embaixo — os mesmos cards da landing */}
        <PricingCards className="mt-10" heading={false} />

        {/* o que vem nos dois, dito por extenso */}
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
    </>
  );
}
