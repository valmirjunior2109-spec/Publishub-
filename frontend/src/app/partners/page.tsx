"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, MousePointerClick, Users, Wallet } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { referralLink } from "@/lib/referral";
import { useErrorText } from "@/lib/useErrorText";
import { useSession } from "@/lib/session";
import type { PartnerProgram } from "@/lib/types";

const BENEFITS = ["access", "commission", "link", "early", "shape"] as const;

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

/** Um número grande com o rótulo embaixo — o mesmo desenho dos cartões do painel. */
function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-[32px] font-bold leading-none tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

/** O painel de quem já é Partner: o link, o botão de copiar e os quatro números. */
function Dashboard({ data }: { data: PartnerProgram }) {
  const t = useTranslations("Partners.program");
  const [copied, setCopied] = useState(false);
  const link = data.code ? referralLink(data.code) : "";

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: o link continua visível para copiar à mão
    }
  }

  return (
    <>
      <Reveal>
        <p className="eyebrow">{t("eyebrow")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[32px] font-medium leading-tight tracking-tight sm:text-[38px]">{t("title")}</h1>
          {data.status && data.status !== "active" && <Badge tone={data.status === "paused" ? "refuted" : "pending"}>{t(`status.${data.status}`)}</Badge>}
        </div>
        <p className="mt-4 font-display text-[56px] font-bold leading-none tracking-[-0.03em] sm:text-[72px]">{t("earned", { amount: money(data.earnings_cents, data.currency) })}</p>
        <p className="mt-2 text-[14px] text-ink-muted">{t("rate", { rate: Math.round(data.commission_rate * 100) })}</p>
        {data.status && data.status !== "active" && <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-ink-muted">{t(`statusNote.${data.status}`)}</p>}
      </Reveal>

      {/* o link */}
      <Reveal delay={120} className="mt-10 rounded-md border border-line bg-paper-raised p-6 sm:p-7">
        <p className="t-label">{t("yourLink")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-paper px-3 py-2 font-sans text-[13.5px] text-ink">{link}</code>
          <Button variant={copied ? "secondary" : "primary"} size="sm" onClick={copy} aria-live="polite" className="min-w-[132px]">
            {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("linkHint")}</p>
      </Reveal>

      {/* os números */}
      <Reveal delay={200} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<MousePointerClick size={14} strokeWidth={1.75} className="text-ink-muted" />} label={t("clicks")} value={String(data.clicks)} />
        <Stat icon={<Users size={14} strokeWidth={1.75} className="text-ink-muted" />} label={t("signups")} value={String(data.signups)} />
        <Stat icon={<Wallet size={14} strokeWidth={1.75} className="text-accent" />} label={t("paidCustomers")} value={String(data.paid_customers)} />
        <Stat label={t("earnings")} value={money(data.earnings_cents, data.currency)} />
      </Reveal>

      <Reveal delay={260} className="mt-4 flex flex-wrap gap-4 text-[13.5px] text-ink-muted">
        <p>{t("joined", { count: data.signups })}</p>
        <p>{t("customers", { count: data.paid_customers })}</p>
      </Reveal>

      <Reveal delay={320} className="mt-8">
        <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-ink-muted">{t("payoutNote")}</p>
        <Link href="/dashboard" className={buttonClasses("ghost", "sm", "mt-3 -ml-3")}>
          {t("backToDashboard")}
        </Link>
      </Reveal>
    </>
  );
}

/** A apresentação do programa: quem não está logado, e quem está mas ainda não entrou. */
function Pitch({ signedIn, onJoin, joining, error }: { signedIn: boolean; onJoin: () => void; joining: boolean; error: string | null }) {
  const t = useTranslations("Partners.program");

  return (
    <div className="grid gap-12 lg:grid-cols-[6fr_5fr] lg:gap-20">
      <Reveal>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-balance sm:text-[46px]">{t("pitchTitle")}</h1>
        <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-ink-muted">{t("pitchLead", { rate: 30 })}</p>

        <div className="mt-8">
          {signedIn ? (
            <Button size="md" className="min-h-12 px-7 text-[15px]" onClick={onJoin} disabled={joining}>
              {joining ? t("joining") : t("cta")}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses("primary", "md", "min-h-12 px-7 text-[15px]")}>
                {t("cta")}
              </Link>
              <Link href="/login" className={buttonClasses("secondary", "md", "min-h-12 px-7 text-[15px]")}>
                {t("signIn")}
              </Link>
            </div>
          )}
          {error && <p className="mt-3 text-[13px] text-refuted">{error}</p>}
          <p className="mt-3 text-[12.5px] text-ink-muted">{t("ctaNote")}</p>
        </div>
      </Reveal>

      <Reveal delay={150} className="lg:pt-8">
        <p className="eyebrow">{t("benefitsTitle")}</p>
        <ul className="mt-4 flex flex-col">
          {BENEFITS.map((key) => (
            <li key={key} className="flex gap-4 border-t border-line py-4 text-[15.5px] leading-relaxed last:border-b">
              <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
              {t(`benefits.${key}`)}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

export default function PartnersPage() {
  const t = useTranslations("Partners.program");
  const { loading, session } = useSession();
  const errorText = useErrorText();
  const [data, setData] = useState<PartnerProgram | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    apiFetch<PartnerProgram>("/api/partners/program")
      .then(setData)
      .catch(() => setData(null));
  }, [session]);

  useEffect(load, [load]);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      setData(await apiFetch<PartnerProgram>("/api/partners/join", { method: "POST" }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setJoining(false);
    }
  }

  const enrolled = !!data?.enrolled;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 pb-24 pt-12 lg:px-16 lg:pt-16">
        {loading ? (
          <div className="min-h-[40vh]" aria-busy="true" />
        ) : enrolled && data ? (
          <Dashboard data={data} />
        ) : (
          <>
            <Pitch signedIn={!!session} onJoin={join} joining={joining} error={error} />
            {data && !data.available && <p className="mt-8 text-[13px] text-ink-muted">{t("unavailable")}</p>}
          </>
        )}
      </main>
    </>
  );
}
