"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, Users } from "lucide-react";
import { ReferralLinkField } from "@/components/ReferralLinkField";
import { buttonClasses } from "@/components/ui/Button";
import { usePolling } from "@/lib/usePolling";
import type { Me, Partners } from "@/lib/types";

/**
 * Publishub Partners no painel: o link, o botão de copiar e o progresso até o Lifetime de graça.
 * Quem já é Partner aprovado não tem meta a cumprir: vê um aviso com o caminho para a área do Partner.
 */
export function PartnersCard() {
  const t = useTranslations("Partners");
  const { data, error } = usePolling<Partners>("/api/partners", { shouldPoll: () => false });
  const { data: me, error: meError } = usePolling<Me>("/api/me", { shouldPoll: () => false });

  if (!me && !meError) return null; // espera saber se é Partner, para o card não piscar com a meta errada

  if (me?.is_partner) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-paper-raised p-6 sm:p-7" aria-labelledby="partners-title">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-accent">
            <BadgeCheck size={14} strokeWidth={1.75} aria-hidden="true" />
            {t("partnerBadge")}
          </p>
          <h2 id="partners-title" className="mt-2 font-display text-[26px] font-medium tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-1 text-[14px] text-ink-muted">{t("partnerLead")}</p>
        </div>
        <Link href="/partners" className={buttonClasses("primary", "md")}>
          {t("partnerCta")}
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  if (error || !data?.available || !data.code) return null; // sem dados ou migração ainda não aplicada: a seção some, o resto do painel segue

  const percent = Math.min(100, (data.conversions / data.goal) * 100);

  return (
    <section className="rounded-md border border-line bg-paper-raised p-6 sm:p-7" aria-labelledby="partners-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            <Users size={14} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 id="partners-title" className="mt-2 font-display text-[26px] font-medium tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-1 text-[14px] text-ink-muted">{t("lead")}</p>
        </div>
        <p className="text-[13px] text-ink-muted">{t("referred", { count: data.referred_total })}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-10">
        {/* o link */}
        <div>
          <ReferralLinkField code={data.code} />
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("how", { goal: data.goal })}</p>
        </div>

        {/* o progresso */}
        <div className="rounded-md border border-line bg-paper p-4">
          {data.unlocked ? (
            <>
              <p className="font-display text-[22px] font-semibold tracking-tight">{t("unlocked")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{t("unlockedLead", { goal: data.goal })}</p>
            </>
          ) : (
            <>
              <p className="t-label">{t("progress")}</p>
              <p className="mt-1 font-display text-[32px] font-bold leading-none tabular-nums tracking-tight">
                {data.conversions} <span className="text-[18px] font-medium text-ink-muted">/ {data.goal}</span>
              </p>
              <p className="mt-1 text-[12.5px] text-ink-muted">{t("purchases")}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-line" aria-hidden="true">
                <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-[13px] leading-relaxed">{t("remaining", { remaining: data.remaining })}</p>
            </>
          )}
          <Link href="/planos" className={buttonClasses("ghost", "sm", "mt-3 -ml-3")}>
            {t("aboutLifetime")}
          </Link>
        </div>
      </div>
    </section>
  );
}
