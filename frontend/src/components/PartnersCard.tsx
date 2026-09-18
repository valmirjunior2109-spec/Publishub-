"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Users } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { referralLink } from "@/lib/referral";
import { usePolling } from "@/lib/usePolling";
import type { Partners } from "@/lib/types";

/** Publishub Partners no painel: o link, o botão de copiar e o progresso até o Lifetime de graça. */
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
  const percent = Math.min(100, (data.conversions / data.goal) * 100);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: o link continua visível para copiar à mão
    }
  }

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
          <p className="t-label">{t("yourLink")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-paper px-3 py-2 font-sans text-[13.5px] text-ink">{link}</code>
            <Button variant={copied ? "secondary" : "primary"} size="sm" onClick={copy} aria-live="polite" className="min-w-[132px]">
              {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
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
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/partners" className={buttonClasses("secondary", "sm")}>
              {t("openProgram")}
            </Link>
            <Link href="/planos" className={buttonClasses("ghost", "sm")}>
              {t("aboutLifetime")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
