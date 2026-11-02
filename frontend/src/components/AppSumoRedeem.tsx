"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, Ticket } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import { APPSUMO_PATH, clearPendingCode, readPendingCode, savePendingCode } from "@/lib/appsumo";
import { useSession } from "@/lib/session";
import { SUPPORT_EMAIL } from "@/lib/support";
import type { AppSumoStatus } from "@/lib/types";
import { useErrorText } from "@/lib/useErrorText";
import { usePolling } from "@/lib/usePolling";

/**
 * O resgate do código do AppSumo (getpublishub.com/appsumo).
 *
 *  - sem conta: a pessoa cola o código, ele fica guardado no navegador, e ela
 *    cria a conta (ou entra) voltando para cá com ?next=/appsumo;
 *  - com conta: resgata, vê o plano ativo e o próximo passo (analisar um vídeo).
 *
 * Quem decide se o código vale é o backend (appsumo_service); a tela só mostra.
 */
export function AppSumoRedeem() {
  const { loading, session } = useSession();
  if (loading) {
    return <div aria-busy="true" className="h-[320px] animate-pulse rounded-2xl border border-line bg-paper-raised" />;
  }
  return session ? <SignedIn email={session.user.email ?? ""} /> : <SignedOut />;
}

/** O código do link (?code=) ou o que ficou guardado: montado só no navegador, depois da sessão. */
function initialCode(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("code") || readPendingCode() || "";
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("AppSumo");
  return (
    <section className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <p className="chip">
        <Ticket size={14} strokeWidth={1.8} aria-hidden="true" />
        {t("eyebrow")}
      </p>
      <h1 className="t-h2 mt-5 text-balance">{t("title")}</h1>
      <p className="mt-3 max-w-[52ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
      {children}
      <p className="mt-6 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
        {t("help", { email: SUPPORT_EMAIL })}
      </p>
    </section>
  );
}

function SignedOut() {
  const t = useTranslations("AppSumo");
  const [code, setCode] = useState(initialCode);
  const next = encodeURIComponent(APPSUMO_PATH);
  return (
    <Shell>
      <label className="mt-6 flex flex-col gap-2 text-[14px] font-medium">
        {t("codeLabel")}
        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("placeholder")} autoComplete="off" spellCheck={false} className="font-mono uppercase tracking-wide" />
      </label>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">{t("needAccount")}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href={`/signup?next=${next}`} onClick={() => savePendingCode(code)} className={buttonClasses("primary", "md", "max-sm:min-h-11 px-5")}>
          {t("createAccount")}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
        <Link href={`/login?next=${next}`} onClick={() => savePendingCode(code)} className={buttonClasses("secondary", "md", "max-sm:min-h-11 px-5")}>
          {t("signIn")}
        </Link>
      </div>
    </Shell>
  );
}

function SignedIn({ email }: { email: string }) {
  const t = useTranslations("AppSumo");
  const describe = useErrorText();
  const { data } = usePolling<AppSumoStatus>("/api/appsumo", { shouldPoll: () => false });
  const [result, setResult] = useState<AppSumoStatus | null>(null);
  // já logado, o código guardado passa para o campo e sai do navegador: um código
  // errado não pode ficar mandando a pessoa do painel para cá toda vez
  const [code, setCode] = useState(() => {
    const value = initialCode();
    clearPendingCode();
    return value;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = result ?? data;
  const plan = current?.plan ?? null;
  const full = plan ? plan.codes >= plan.max_codes : false;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch<AppSumoStatus>("/api/appsumo/redeem", { method: "POST", body: { code } });
      setResult(next);
      setCode("");
      clearPendingCode();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="mt-3 text-[13.5px] text-ink-muted">{t("signedInAs", { email })}</p>

      {plan && (
        <div role="status" className="mt-6 rounded-[20px] border border-[rgba(var(--accent-rgb),0.3)] bg-accent-soft p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-accent">
            <BadgeCheck size={18} strokeWidth={2} aria-hidden="true" />
            {t("successTitle")}
          </p>
          <p className="mt-2 text-[18px] font-semibold tracking-[-0.01em]">
            {t("planLine", { tier: t(plan.tier === "pro" ? "tierPro" : "tierCreator"), codes: plan.codes, max: plan.max_codes })}
          </p>
          <p className="mt-1 font-mono text-[14px] text-ink-muted">{t("monthly", { limit: plan.monthly_limit, used: current?.used_this_month ?? 0 })}</p>
          <Link href="/new-analysis" className={buttonClasses("primary", "md", "mt-5 max-sm:min-h-11 px-5")}>
            {t("analyze")}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      )}

      {full ? (
        <p className="mt-5 text-[14px] text-ink-muted">{t("maxed", { max: plan?.max_codes ?? 0 })}</p>
      ) : (
        <form onSubmit={submit} className="mt-6">
          <label className="flex flex-col gap-2 text-[14px] font-medium">
            {plan ? t("stackLabel") : t("codeLabel")}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("placeholder")} autoComplete="off" spellCheck={false} className="min-h-10 max-sm:min-h-11 flex-1 font-mono uppercase tracking-wide" />
              <Button type="submit" className="max-sm:min-h-11 px-6" disabled={busy || !code.trim()}>
                {busy ? t("redeeming") : t("redeem")}
              </Button>
            </div>
          </label>
          {plan && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{t("stackHint")}</p>}
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper p-3 text-[14px] text-refuted">
          {error}
        </p>
      )}
    </Shell>
  );
}
