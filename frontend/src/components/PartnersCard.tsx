"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Users } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { referralLink } from "@/lib/referral";
import { usePolling } from "@/lib/usePolling";
import type { Partners } from "@/lib/types";

/** Publishub Partners no painel: o link, o botão de copiar e o convite para ganhar comissão. */
export function PartnersCard() {
  const t = useTranslations("Partners");
  const { data, error } = usePolling<Partners>("/api/partners", { shouldPoll: () => false });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (error || !data?.available || !data.code) return null; // sem dados ou migração ainda não aplicada: a seção some, o resto do painel segue

  const link = referralLink(data.code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: o link continua visível para copiar à mão
    }
  }

  return (
    <section className="rounded-xl border border-line bg-paper-raised p-4 sm:p-5" aria-labelledby="partners-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 t-label">
            <Users size={14} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 id="partners-title" className="mt-1.5 font-display text-[19px] font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-1 text-[14px] text-ink-muted">{t("lead")}</p>
        </div>
        <p className="text-[13px] text-ink-muted">{t("referred", { count: data.referred_total })}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-6">
        {/* o link */}
        <div>
          <p className="t-label">{t("yourLink")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-paper px-3 py-2 font-sans text-[13.5px] text-ink">{link}</code>
            <Button variant={copied ? "secondary" : "primary"} size="sm" onClick={copy} aria-live="polite" className="min-w-[132px]">
              {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          {/* indique e ganhe: o motivo para mandar o link hoje, antes de qualquer compra */}
          {Boolean(data.bonus_per_referral) && (
            <p className="mt-3 rounded-lg border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft px-3 py-2 text-[13px] leading-relaxed">
              {t("bonus", { count: data.bonus_per_referral ?? 0, max: data.bonus_max_referrals ?? 0 })}
            </p>
          )}
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("how")}</p>
        </div>

        {/* a comissão: o motivo para entrar no programa */}
        <div className="rounded-md border border-line bg-paper p-4">
          <p className="t-label">{t("commissionTitle")}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed">{t("commissionLead")}</p>
          <Link href="/partners" className={buttonClasses("secondary", "sm", "mt-3")}>
            {t("openProgram")}
          </Link>
        </div>
      </div>
    </section>
  );
}
