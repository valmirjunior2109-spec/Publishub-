"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { PlanOptions } from "@/components/PlanOptions";
import { useTrackOnce } from "@/lib/events";
import { FREE_UPLOADS } from "@/lib/pricing";
import type { Entitlement } from "@/lib/types";

/**
 * Aparece no lugar do formulário quando os uploads grátis acabaram (um limite de
 * verdade, contado no backend). O histórico continua acessível no painel: o
 * caminho de volta para o grátis fica ao lado das opções pagas, não escondido.
 */
export function Paywall({ entitlement }: { entitlement: Entitlement }) {
  const t = useTranslations("Billing.paywall");
  const limit = entitlement.uploads_limit ?? FREE_UPLOADS;
  const unlocks = t.raw("unlocks") as string[];
  useTrackOnce("paywall_viewed", true, null, { where: "upload", uploads_used: entitlement.uploads_used });

  return (
    <section className="stagger mt-10 grid gap-8 rounded-md border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-7 sm:p-9 lg:grid-cols-[1fr_1fr] lg:items-start">
      <div>
        <p className="t-label text-accent">{t("eyebrow")}</p>
        <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[34px]">{t("title", { limit })}</h2>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {unlocks.map((item) => (
            <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug">
              <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link href="/dashboard" className="mt-6 inline-block text-[14px] font-medium underline-offset-2 hover:underline">
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
