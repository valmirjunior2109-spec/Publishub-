import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, ShieldCheck } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Emphasis } from "@/components/landing/Emphasis";
import { FounderSpotsCounter } from "@/components/FounderSpotsCounter";
import { Reveal } from "@/components/Reveal";
import { TrackedLink } from "@/components/TrackedLink";
import { TrackInView } from "@/components/TrackInView";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { PLANS, type PaidPlan } from "@/lib/pricing";

interface PricingCardsProps {
  className?: string;
  /** false em telas que já têm o próprio título (a /pricing): dois cabeçalhos seguidos dizem a mesma coisa duas vezes. */
  heading?: boolean;
  /** O rótulo acima do título. Sem ele, "Preços". */
  eyebrow?: ReactNode;
  /** Onde o preço aparece, para o `pricing_viewed` e os cliques. */
  where: string;
}

/**
 * Os planos lado a lado: as duas assinaturas (Creator e Pro) e o grátis embaixo,
 * para quem ainda não testou. O Founder Lifetime saiu de venda (o vitalício agora
 * é só no AppSumo); o PlanCard continua sabendo desenhar um pagamento único.
 *
 * Cada linha das listas corresponde a algo que o backend faz hoje: o Pro roda a
 * análise profunda (mais frames, plano maior: ai_service / analysis_service), o
 * Creator a completa de sempre. O grátis não diz quantas análises saem completas:
 * o número é do backend (FREE_FULL_ANALYSES).
 */
export async function PricingCards({ className, heading = true, eyebrow, where }: PricingCardsProps) {
  const t = await getTranslations("Pricing");
  const locale = await getLocale();
  const free = t.raw("free.items") as string[];

  return (
    <div className={className}>
      <TrackInView event="pricing_viewed" where={where} />
      {heading && (
        <Reveal className="max-w-[720px]">
          {eyebrow ?? <p className="eyebrow">{t("eyebrow")}</p>}
          <h2 className="t-h2 mt-5 text-balance">
            <Emphasis text={t("title")} />
          </h2>
          <p className="t-lead mt-5 max-w-[58ch]">{t("lead")}</p>
        </Reveal>
      )}

      {/* as assinaturas: renovam todo mês até a pessoa cancelar */}
      <section aria-labelledby="pricing-monthly" className={cn("flex flex-col", heading && "mt-12 lg:mt-16")}>
        <p id="pricing-monthly" className="t-label">
          {t("monthlyGroup")}
        </p>
        <div className="mt-3 grid flex-1 gap-5 sm:grid-cols-2">
          <PlanCard plan={PLANS.creator} where={where} />
          <PlanCard plan={PLANS.pro} where={where} badge={t("plans.pro.badge")} />
        </div>
      </section>

      {/* grátis: começa aqui, sem cartão */}
      <Reveal delay={200} className="mt-5 grid gap-6 rounded-[28px] border border-line bg-paper p-7 sm:p-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
        <div className="flex flex-col">
          <p className="text-[14px] font-medium text-ink">{t("free.name")}</p>
          <p className="mt-4 font-serif text-[44px] font-medium leading-none tracking-[-0.03em] tabular-nums">{t("free.price")}</p>
          <p className="mt-3 text-[14.5px] text-ink-muted">{t("free.terms")}</p>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">{t("free.lead")}</p>
          <div className="mt-6 lg:mt-auto lg:pt-6">
            <TrackedLink where={`${where}_pricing_free`} href={localePath(locale, "/try")} className={buttonClasses("secondary", "md", "w-full sm:w-auto")}>
              {t("free.cta")}
            </TrackedLink>
          </div>
        </div>
        <FeatureList items={free} muted />
      </Reveal>

      <p className="mt-5 max-w-[720px] text-[13px] leading-relaxed text-ink-muted">{t("note")}</p>
    </div>
  );
}

/** Um plano pago: nome, preço, a frequência da cobrança, para quem é, o botão, o que vem nele e os termos. */
async function PlanCard({ plan, where, badge }: { plan: PaidPlan; where: string; badge?: string }) {
  const t = await getTranslations("Pricing");
  const items = t.raw(`plans.${plan.id}.items`) as string[];
  const once = plan.billing === "once";

  return (
    <Reveal
      delay={plan.id === "creator" ? 60 : plan.id === "pro" ? 120 : 180}
      className={cn(
        "flex w-full flex-col rounded-[28px] border p-7 sm:p-8",
        once ? "border-[rgba(var(--accent-rgb),0.45)] bg-accent-soft" : plan.id === "pro" ? "border-ink bg-paper-raised" : "border-line bg-paper-raised",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold text-ink">{t(`plans.${plan.id}.name`)}</h3>
        {badge && <Badge tone={once ? "accent" : "ink"}>{badge}</Badge>}
      </div>

      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-serif text-[56px] font-medium leading-none tracking-[-0.035em] tabular-nums sm:text-[64px]">{plan.display}</span>
        <span className="text-[15px] font-medium text-ink-muted">{once ? t("once") : t("perMonth")}</span>
      </p>
      <p className="mt-3 text-[14px] font-medium text-ink">{t(`plans.${plan.id}.billing`)}</p>
      {once && <FounderSpotsCounter className="mt-5" />}
      <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">{t(`plans.${plan.id}.audience`)}</p>

      <div className="mt-6">
        <CheckoutButton plan={plan} where={where} className={buttonClasses(plan.id === "creator" ? "secondary" : "primary", "md", "w-full")}>
          {t(`plans.${plan.id}.cta`)}
        </CheckoutButton>
        {once && (
          // a garantia de 7 dias, colada no botão: é ali que a dúvida aparece
          <p className="mt-3 flex items-start justify-center gap-2 text-center text-[13px] leading-snug text-ink-muted">
            <ShieldCheck size={15} strokeWidth={2} className="mt-px shrink-0 text-confirmed" aria-hidden="true" />
            {t("guarantee")}
          </p>
        )}
      </div>

      <FeatureList items={items} className="mt-7" />
      <p className="mt-auto pt-6 text-[12.5px] leading-relaxed text-ink-muted">{t(`plans.${plan.id}.terms`, { price: plan.display })}</p>
    </Reveal>
  );
}

function FeatureList({ items, muted = false, className }: { items: string[]; muted?: boolean; className?: string }) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 border-t border-line py-3 text-[14.5px] leading-snug first:border-t-0 first:pt-0">
          <Check size={17} strokeWidth={2.25} className={cn("mt-px shrink-0", muted ? "text-ink-muted" : "text-accent")} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
