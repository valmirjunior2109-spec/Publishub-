"use client";

import { useTranslations } from "next-intl";
import { CheckoutButton } from "@/components/CheckoutButton";
import { buttonClasses } from "@/components/ui/Button";
import { ANALYSES_PER_MONTH, OFFER } from "@/lib/pricing";
import type { Entitlement } from "@/lib/types";

/** Aparece no lugar do formulário quando a conta não pode mais analisar: teste usado ou limite do mês. */
export function Paywall({ entitlement }: { entitlement: Entitlement }) {
  const t = useTranslations("Billing.paywall");
  const tPlans = useTranslations("Plans");
  const monthly = entitlement.period === "month";
  const limit = entitlement.analyses_limit ?? ANALYSES_PER_MONTH;

  return (
    <section className="stagger mt-10 grid gap-8 rounded-md border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-7 sm:p-9 lg:grid-cols-[3fr_2fr] lg:items-center">
      <div>
        <p className="t-label text-accent">{t("eyebrow")}</p>
        <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[34px]">{monthly ? t("limitTitle") : t("trialTitle")}</h2>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{monthly ? t("limitLead", { limit }) : t("trialLead", { limit: ANALYSES_PER_MONTH })}</p>
        {!monthly && (
          <>
            <CheckoutButton className={buttonClasses("primary", "md", "mt-6 min-h-12 px-7 text-[15px]")}>{t("cta")}</CheckoutButton>
            <p className="mt-3 max-w-[48ch] text-[12.5px] leading-relaxed text-ink-muted">{t("note")}</p>
          </>
        )}
      </div>
      {!monthly && (
        <div className="rounded-md border border-line bg-paper-raised p-6">
          <p className="eyebrow">{tPlans("eyebrow", { plan: OFFER.name })}</p>
          <p className="mt-3 font-display text-[64px] font-bold leading-none tracking-[-0.03em]">{OFFER.display}</p>
          <p className="mt-2 text-sm text-ink-muted">{tPlans("once")}</p>
        </div>
      )}
    </section>
  );
}
