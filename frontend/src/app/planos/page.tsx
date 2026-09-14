import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { analysesPerMonthLabel, offerFor } from "@/lib/pricing";

const BENEFITS = ["second", "phrase", "rewrites", "copilot", "loop", "history", "oneTime", "updates"] as const;

export default async function PlansPage() {
  const t = await getTranslations("Plans");
  const offer = offerFor();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 pb-24 pt-12 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
          {/* ---------- o preço ---------- */}
          <Reveal>
            <p className="eyebrow">{t("eyebrow", { plan: offer.name })}</p>
            <Badge tone="ink" className="mt-4 text-[12px]">
              {t("notSubscription")}
            </Badge>
            <p className="mt-6 font-display text-[88px] font-bold leading-none tracking-[-0.035em] sm:text-[112px]">{offer.display}</p>
            <p className="mt-2 text-sm text-ink-muted">{t("once")}</p>
            <p className="mt-1 max-w-[40ch] text-[12.5px] leading-relaxed text-ink-muted">{t("currencyNote")}</p>

            <h1 className="mt-10 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[34px]">{t("title")}</h1>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>

            <a href={offer.checkoutUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md", "mt-8 min-h-12 px-7 text-[15px]")}>
              {t("cta")}
            </a>
            <p className="mt-3 text-[12.5px] text-ink-muted">{t("stripe")}</p>
          </Reveal>

          {/* ---------- o que inclui ---------- */}
          <Reveal delay={150} className="lg:pt-8">
            <p className="eyebrow">{t("includes")}</p>
            <ul className="mt-4 flex flex-col">
              {BENEFITS.map((key) => (
                <li key={key} className="flex gap-4 border-t border-line py-4 text-[15.5px] leading-relaxed last:border-b">
                  <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  {t(`benefits.${key}`)}
                </li>
              ))}
              {/* TODO: o limite de análises vem de lib/pricing.ts; enquanto for null, mostra "X" */}
              <li className="flex gap-4 border-b border-line py-4 text-[15.5px] leading-relaxed">
                <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                <span>
                  {t("benefits.limit", { count: analysesPerMonthLabel() })}
                  <Badge className="ml-3 align-middle">TODO</Badge>
                </span>
              </li>
            </ul>
          </Reveal>
        </div>
      </main>
    </>
  );
}
