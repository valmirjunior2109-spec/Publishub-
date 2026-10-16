"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { track } from "@/lib/events";
import { PAID_PLANS } from "@/lib/pricing";

/**
 * Os três planos pagos numa lista curta, para os pontos em que a pessoa bate num
 * limite (o paywall do upload, o plano bloqueado, as reescritas, o próximo passo).
 *
 * Cada linha diz o preço e se ele se repete: "por mês" nas assinaturas, "uma vez"
 * no Founder Lifetime. O link "Comparar planos" leva à /pricing, onde está o resto.
 */
export function PlanOptions({ where, analysisId, className }: { where: string; analysisId?: string | null; className?: string }) {
  const t = useTranslations("Billing.options");
  const tPlans = useTranslations("Pricing.plans");

  return (
    <div className={className}>
      <ul className="flex flex-col divide-y divide-line rounded-md border border-line bg-paper text-left">
        {PAID_PLANS.map((plan) => (
          <li key={plan.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold">
                {tPlans(`${plan.id}.name`)}
                <Badge tone={plan.billing === "once" ? "accent" : "neutral"}>{plan.billing === "once" ? t("once") : t("monthly")}</Badge>
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                <span className="font-medium tabular-nums text-ink">{plan.billing === "once" ? t("priceOnce", { price: plan.display }) : t("priceMonthly", { price: plan.display })}</span>
                {" · "}
                {plan.billing === "once" ? t("noRenewal") : t("renews")}
              </p>
            </div>
            <CheckoutButton
              plan={plan}
              where={where}
              analysisId={analysisId}
              className={buttonClasses(plan.id === "pro" ? "primary" : "secondary", "sm", "min-h-10 shrink-0 px-4")}
            >
              {t("choose", { plan: tPlans(`${plan.id}.name`) })}
            </CheckoutButton>
          </li>
        ))}
      </ul>
      <Link
        href="/pricing"
        onClick={() => track("upgrade_clicked", analysisId ?? null, { where: `${where}_compare` })}
        className={cn("mt-3 inline-block text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline")}
      >
        {t("compare")}
      </Link>
    </div>
  );
}
