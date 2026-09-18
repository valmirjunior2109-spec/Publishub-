"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, MousePointerClick, Pencil, Send, Users, Wallet } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { referralLink } from "@/lib/referral";
import { useErrorText } from "@/lib/useErrorText";
import { useSession } from "@/lib/session";
import type { PartnerProgram } from "@/lib/types";

const BENEFITS = ["access", "commission", "link", "shape"] as const;

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

/** Copia um texto e confirma por 2 s. O mesmo botão serve para o link e para o post. */
function CopyButton({ text, label, copiedLabel, className }: { text: string; label: string; copiedLabel: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: o texto continua na tela para copiar à mão
    }
  }

  return (
    <Button variant={copied ? "secondary" : "primary"} size="sm" onClick={copy} aria-live="polite" className={className}>
      {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

/** Escolher o código do link (/?ref=copilot). Só aparece antes da primeira indicação. */
function CodeEditor({ code, onSaved }: { code: string; onSaved: (data: PartnerProgram) => void }) {
  const t = useTranslations("Partners.program");
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(code);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      onSaved(await apiFetch<PartnerProgram>("/api/partners/code", { method: "POST", body: { code: value.trim() } }));
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
        <Pencil size={13} strokeWidth={1.75} aria-hidden="true" />
        {t("customize")}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-sm border border-line bg-paper p-3">
      <label htmlFor="ref-code" className="t-label">
        {t("customizeLabel")}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] text-ink-muted">/?ref=</span>
        <input
          id="ref-code"
          value={value}
          maxLength={24}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-sm border border-line bg-paper-raised px-3 py-2 text-[13.5px] text-ink"
        />
        <Button size="sm" onClick={save} disabled={saving || value.trim().length < 3}>
          {saving ? t("saving") : t("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
          {t("cancel")}
        </Button>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{t("customizeHint")}</p>
      {error && <p className="mt-2 text-[12.5px] text-refuted">{error}</p>}
    </div>
  );
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

/** Onde a pessoa pode divulgar em um clique. Sem SDK: são links normais de compartilhar. */
const NETWORKS = [
  { key: "x", href: (text: string, link: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(`${text}\n\n${link}`)}` },
  { key: "whatsapp", href: (text: string, link: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${link}`)}` },
  { key: "telegram", href: (text: string, link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
  { key: "linkedin", href: (_text: string, link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
] as const;

/** O painel de quem já é Partner: o link, o post pronto e os números. */
function Dashboard({ data, onChange }: { data: PartnerProgram; onChange: (data: PartnerProgram) => void }) {
  const t = useTranslations("Partners.program");
  const link = data.code ? referralLink(data.code) : "";
  const pitch = t("sharePitch");
  const post = `${pitch}\n\n${link}`;
  // as duas taxas que dizem onde o funil trava: quem clica vira conta? quem cria conta paga?
  const signupRate = data.clicks > 0 ? Math.round((data.signups / data.clicks) * 100) : null;
  const payingRate = data.signups > 0 ? Math.round((data.paid_customers / data.signups) * 100) : null;

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
          <CopyButton text={link} label={t("copy")} copiedLabel={t("copied")} className="min-w-[132px]" />
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("linkHint")}</p>
        {/* trocar o código depois de divulgar quebraria os links já espalhados: só antes da primeira indicação */}
        {data.code && data.signups === 0 && <CodeEditor code={data.code} onSaved={onChange} />}
      </Reveal>

      {/* o vitalício de graça: o motivo mais forte para divulgar quando a comissão ainda é pequena */}
      <Reveal delay={140} className="mt-6 rounded-md border border-line bg-paper-raised p-6 sm:p-7">
        {data.unlocked ? (
          <>
            <p className="font-display text-[24px] font-medium tracking-tight">{t("unlocked")}</p>
            <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-muted">{t("unlockedLead", { goal: data.goal })}</p>
          </>
        ) : (
          <>
            <p className="t-label">{t("freeAccess")}</p>
            <p className="mt-2 font-display text-[32px] font-bold leading-none tabular-nums tracking-tight">
              {data.paid_customers} <span className="text-[18px] font-medium text-ink-muted">/ {data.goal}</span>
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-line" aria-hidden="true">
              <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${Math.min(100, (data.paid_customers / data.goal) * 100)}%` }} />
            </div>
            <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed">{t("freeAccessLead", { remaining: data.remaining })}</p>
          </>
        )}
      </Reveal>

      {/* o post pronto: o trabalho que sobra para o creator é colar */}
      <Reveal delay={160} className="mt-6 rounded-md border border-line bg-paper-raised p-6 sm:p-7">
        <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          <Send size={14} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          {t("shareTitle")}
        </p>
        <p className="mt-3 whitespace-pre-line rounded-sm border border-line bg-paper p-4 text-[14.5px] leading-relaxed">{post}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyButton text={post} label={t("copyPost")} copiedLabel={t("copied")} />
          {NETWORKS.map((network) => (
            <a
              key={network.key}
              href={network.href(pitch, link)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              {t(`networks.${network.key}`)}
            </a>
          ))}
        </div>
      </Reveal>

      {/* os números */}
      <Reveal delay={200} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<MousePointerClick size={14} strokeWidth={1.75} className="text-ink-muted" />} label={t("clicks")} value={String(data.clicks)} />
        <Stat icon={<Users size={14} strokeWidth={1.75} className="text-ink-muted" />} label={t("signups")} value={String(data.signups)} />
        <Stat icon={<Wallet size={14} strokeWidth={1.75} className="text-accent" />} label={t("paidCustomers")} value={String(data.paid_customers)} />
        <Stat label={t("earnings")} value={money(data.earnings_cents, data.currency)} />
      </Reveal>

      <Reveal delay={260} className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-muted">
        <p>{t("joined", { count: data.signups })}</p>
        <p>{t("customers", { count: data.paid_customers })}</p>
        {signupRate !== null && <p>{t("signupRate", { rate: signupRate })}</p>}
        {payingRate !== null && <p>{t("payingRate", { rate: payingRate })}</p>}
      </Reveal>

      {data.clicks === 0 && (
        <Reveal delay={300} className="mt-8 rounded-md border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-5">
          <p className="font-display text-[18px] font-medium tracking-tight">{t("firstStepTitle")}</p>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed">{t("firstStepLead")}</p>
        </Reveal>
      )}

      <Reveal delay={340} className="mt-8">
        <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-ink-muted">{t("payoutNote")}</p>
        <Link href="/dashboard" className={buttonClasses("ghost", "sm", "mt-3 -ml-3")}>
          {t("backToDashboard")}
        </Link>
      </Reveal>
    </>
  );
}

/** A apresentação do programa: quem não está logado, e quem está mas ainda não entrou. */
function Pitch({ data, signedIn, onJoin, joining, error }: { data: PartnerProgram | null; signedIn: boolean; onJoin: () => void; joining: boolean; error: string | null }) {
  const t = useTranslations("Partners.program");
  // sem sessão não há dados do servidor: cai nos valores padrão do programa
  const rate = Math.round((data?.commission_rate ?? 0.3) * 100);
  const goal = data?.goal ?? 5;

  return (
    <div className="grid gap-12 lg:grid-cols-[6fr_5fr] lg:gap-20">
      <Reveal>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-balance sm:text-[46px]">{t("pitchTitle")}</h1>
        <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-ink-muted">{t("pitchLead", { rate, goal })}</p>

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
              {t(`benefits.${key}`, { rate, goal })}
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
          <Dashboard data={data} onChange={setData} />
        ) : (
          <>
            <Pitch data={data} signedIn={!!session} onJoin={join} joining={joining} error={error} />
            {data && !data.available && <p className="mt-8 text-[13px] text-ink-muted">{t("unavailable")}</p>}
          </>
        )}
      </main>
    </>
  );
}
