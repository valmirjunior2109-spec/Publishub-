"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { PlanOptions } from "@/components/PlanOptions";
import { buttonClasses } from "@/components/ui/Button";
import { useTrackOnce } from "@/lib/events";
import { FREE_UPLOADS } from "@/lib/pricing";
import type { Entitlement } from "@/lib/types";

/**
 * Aparece no lugar do formulário quando os uploads grátis acabaram (um limite de
 * verdade, contado no backend). O histórico continua acessível no painel: o
 * caminho de volta para o grátis fica ao lado das opções pagas, não escondido.
 */
export function Paywall({ entitlement }: { entitlement: Entitlement }) {
  if (entitlement.plan === "appsumo") return <AppSumoLimit entitlement={entitlement} />;
  return <FreePaywall entitlement={entitlement} />;
}

/** Plano AppSumo: o limite do mês acabou. Renova no dia 1, ou um código a mais sobe o limite na hora. */
function AppSumoLimit({ entitlement }: { entitlement: Entitlement }) {
  const t = useTranslations("Billing.paywall");
  useTrackOnce("paywall_viewed", true, null, { where: "appsumo_limit", uploads_used: entitlement.uploads_used });
  const full = entitlement.appsumo ? entitlement.appsumo.codes >= entitlement.appsumo.max_codes : true;
  return (
    <section className="mt-6 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-5 sm:p-6">
      <h2 className="font-display text-[21px] font-medium leading-tight tracking-tight">{t("appsumoTitle", { limit: entitlement.uploads_limit ?? 0 })}</h2>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-muted">{t("appsumoLead")}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        {!full && (
          <Link href="/appsumo" className={buttonClasses("primary", "md", "max-sm:min-h-11 px-5")}>
            {t("appsumoCta")}
          </Link>
        )}
        <Link href="/dashboard" className="text-[14px] font-medium underline-offset-2 hover:underline">
          {t("back")}
        </Link>
      </div>
    </section>
  );
}

function FreePaywall({ entitlement }: { entitlement: Entitlement }) {
  const t = useTranslations("Billing.paywall");
  const limit = entitlement.uploads_limit ?? FREE_UPLOADS;
  const unlocks = t.raw("unlocks") as string[];
  useTrackOnce("paywall_viewed", true, null, { where: "upload", uploads_used: entitlement.uploads_used });

  return (
    <section className="stagger mt-6 grid gap-5 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-5 sm:p-6 lg:grid-cols-[1fr_1fr] lg:items-start">
      <div>
        <p className="t-label text-accent">{t("eyebrow")}</p>
        <h2 className="mt-2 font-display text-[22px] font-medium leading-tight tracking-tight sm:text-[26px]">{t("title", { limit })}</h2>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {unlocks.map((item) => (
            <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug">
              <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link href="/dashboard" className="mt-5 inline-block text-[14px] font-medium underline-offset-2 hover:underline">
          {t("back")}
        </Link>
      </div>
      <div>
        <PlanOptions where="upload" />
        <p className="mt-3 max-w-[48ch] text-[12.5px] leading-relaxed text-ink-muted">{t("note")}</p>
      </div>
    </section>
  );
}
