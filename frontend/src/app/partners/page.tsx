"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ReferralLinkField } from "@/components/ReferralLinkField";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useErrorText } from "@/lib/useErrorText";
import { usePolling } from "@/lib/usePolling";
import type { PartnerStats } from "@/lib/types";

const STATS = ["clicks", "signups", "active", "conversions"] as const;

function PartnerArea() {
  const t = useTranslations("Partner");
  const format = useFormatter();
  const errorText = useErrorText();
  const { data, error } = usePolling<PartnerStats>("/api/partner/stats", { shouldPoll: () => false });

  const values: Record<(typeof STATS)[number], number> | null = data && {
    clicks: data.clicks,
    signups: data.signups,
    active: data.active_users,
    conversions: data.conversions,
  };

  return (
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-8 lg:px-12 lg:pt-12">
      <div className="stagger">
        <p className="eyebrow">{t("eyebrow")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="font-display text-[34px] font-medium tracking-tight sm:text-[40px]">{t("title")}</h1>
          {data && (
            <Badge tone="accent" className="text-[12px]">
              <BadgeCheck size={14} strokeWidth={1.75} aria-hidden="true" />
              {t("lifetimeBadge")}
            </Badge>
          )}
        </div>
      </div>

      {error?.code === "NOT_PARTNER" ? (
        <Card className="mt-10 max-w-[560px]" role="status">
          <p className="font-display text-[22px] font-medium tracking-tight">{t("notPartnerTitle")}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{t("notPartnerLead")}</p>
          <Link href="/dashboard" className={buttonClasses("secondary", "md", "mt-5")}>
            {t("backToDashboard")}
          </Link>
        </Card>
      ) : error ? (
        <p role="alert" className="mt-10 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
          {errorText(error)}
        </p>
      ) : !data || !values ? (
        <div className="flex justify-center py-24" aria-busy="true">
          <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-accent" />
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">
            {t("lead")}
            {data.partner_since && ` ${t("since", { date: format.dateTime(new Date(data.partner_since), { day: "numeric", month: "long", year: "numeric" }) })}`}
          </p>

          <Card className="mt-8">
            <ReferralLinkField code={data.code} />
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("linkNote")}</p>
          </Card>

          <h2 className="eyebrow mb-3 mt-10">{t("statsTitle")}</h2>
          <dl className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((key) => (
              <div key={key} className="rounded-md border border-line bg-paper-raised p-5">
                <dt className="t-label">{t(`stats.${key}.label`)}</dt>
                <dd className="mt-2 font-display text-[40px] font-bold leading-none tabular-nums tracking-tight">{format.number(values[key])}</dd>
                <dd className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t(`stats.${key}.hint`)}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
            <BadgeCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            {t("freeNote")}
          </p>
        </>
      )}
    </main>
  );
}

export default function PartnersPage() {
  return (
    <RequireAuth>
      {(session) => (
        <AppShell session={session}>
          <PartnerArea />
        </AppShell>
      )}
    </RequireAuth>
  );
}
