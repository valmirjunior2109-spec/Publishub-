"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useFormatter, useTranslations } from "next-intl";
import { CreditCard, LifeBuoy, Trash2 } from "lucide-react";
import { useAppSession } from "@/components/AppArea";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import { signOut } from "@/lib/supabase";
import { supportMailto, SUPPORT_EMAIL } from "@/lib/support";
import { useErrorText } from "@/lib/useErrorText";
import { useAccount } from "@/lib/account";
import type { Entitlement } from "@/lib/types";

/**
 * O plano da conta e o que acontece com a cobrança. Quem assina o Creator ou o
 * Pro vê quando renova (ou quando acaba) e abre o portal do Stripe para cancelar
 * ou trocar o cartão; o Founder Lifetime diz que não renova; o grátis vê os planos.
 */
function BillingSection({ entitlement }: { entitlement: Entitlement }) {
  const t = useTranslations("Account.billing");
  const format = useFormatter();
  const describe = useErrorText();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscription = entitlement.subscription;
  const date = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" }) : "—");

  async function openPortal() {
    setOpening(true);
    setError(null);
    try {
      // o link do portal é criado no servidor, para a assinatura desta conta
      const { url } = await apiFetch<{ url: string }>("/api/billing/portal", { method: "POST" });
      window.location.assign(url);
    } catch (err) {
      setError(describe(err));
      setOpening(false);
    }
  }

  if (!entitlement.billing_configured && !subscription) return null;

  return (
    <section className="mt-6 rounded-md border border-line bg-paper-raised p-6">
      <p className="t-label flex items-center gap-2">
        <CreditCard size={15} strokeWidth={1.75} aria-hidden="true" />
        {t("title")}
      </p>
      {subscription ? (
        <>
          <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">
            {subscription.cancel_at_period_end
              ? t("endsOn", { date: date(subscription.current_period_end) })
              : subscription.status === "past_due"
                ? t("pastDue")
                : t("renewsOn", { date: date(subscription.current_period_end) })}
          </p>
          {entitlement.plan === "lifetime" && <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{t("alsoLifetime")}</p>}
          <Button variant="secondary" className="mt-4 min-h-11" onClick={openPortal} disabled={opening}>
            {opening ? t("opening") : t("manage")}
          </Button>
          <p className="mt-2.5 text-[12.5px] text-ink-muted">{t("manageNote")}</p>
        </>
      ) : entitlement.plan === "appsumo" && entitlement.appsumo ? (
        <>
          <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{t("appsumo", { codes: entitlement.appsumo.codes, limit: entitlement.appsumo.monthly_limit })}</p>
          {entitlement.appsumo.codes < entitlement.appsumo.max_codes && (
            <Link href="/appsumo" className={buttonClasses("secondary", "md", "mt-4 min-h-11")}>
              {t("appsumoAdd")}
            </Link>
          )}
        </>
      ) : entitlement.plan === "lifetime" ? (
        <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{entitlement.source === "partners" ? t("lifetimePartners") : t("lifetime")}</p>
      ) : (
        <>
          <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{t("free")}</p>
          <Link href="/pricing" className={buttonClasses("secondary", "md", "mt-4 min-h-11")}>
            {t("seePlans")}
          </Link>
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper p-3 text-sm text-refuted">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * A página da conta: quem você é aqui, o plano, como falar com uma pessoa, os
 * documentos e o botão de apagar tudo.
 *
 * A exclusão pede o e-mail digitado à mão de propósito: é irreversível, e
 * confirmar com um clique só transformaria um engano em perda.
 */
function Account({ session }: { session: Session }) {
  const t = useTranslations("Account");
  const tBilling = useTranslations("Billing");
  const format = useFormatter();
  const describe = useErrorText();
  const router = useRouter();

  const { data: me } = useAccount().me;
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = me?.email ?? session.user.email ?? "";

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleting(true);
    setError(null);
    try {
      await apiFetch("/api/me/delete", { method: "POST", body: { confirmation } });
      // a conta já não existe no servidor: a sessão local também não faz sentido
      await signOut();
      router.replace("/?apagada=1");
    } catch (err) {
      setError(describe(err));
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[760px] px-5 pb-24 pt-8 lg:pt-12">
      <div className="stagger">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display font-semibold text-[40px] leading-[1.02] tracking-[-0.045em] sm:text-[48px]">{t("title")}</h1>
      </div>

      <dl className="mt-8 grid gap-4 rounded-md border border-line bg-paper-raised p-6 sm:grid-cols-3">
        <div>
          <dt className="t-label">{t("emailLabel")}</dt>
          <dd className="mt-1.5 break-all text-[14px]">{email}</dd>
        </div>
        <div>
          <dt className="t-label">{t("planLabel")}</dt>
          <dd className="mt-1.5 text-[14px]">{me ? tBilling(me.entitlement.plan) : "—"}</dd>
        </div>
        <div>
          <dt className="t-label">{t("sinceLabel")}</dt>
          <dd className="mt-1.5 text-[14px]">{me?.created_at ? format.dateTime(new Date(me.created_at), { day: "numeric", month: "short", year: "numeric" }) : "—"}</dd>
        </div>
      </dl>

      {me && <BillingSection entitlement={me.entitlement} />}

      {/* suporte humano, não chatbot */}
      <section className="mt-6 rounded-md border border-line bg-paper-raised p-6">
        <p className="t-label flex items-center gap-2">
          <LifeBuoy size={15} strokeWidth={1.75} aria-hidden="true" />
          {t("support.title")}
        </p>
        <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{t("support.lead")}</p>
        <a href={supportMailto("publishub: preciso de ajuda")} className={buttonClasses("secondary", "md", "mt-4 min-h-11")}>
          {t("support.cta")}
        </a>
        <p className="mt-2.5 text-[12.5px] text-ink-muted">{SUPPORT_EMAIL}</p>
      </section>

      <section className="mt-6 rounded-md border border-line bg-paper-raised p-6">
        <p className="t-label">{t("legal.title")}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-[14px]">
          <Link href="/privacy" className="font-medium underline-offset-2 hover:underline">
            {t("legal.privacy")}
          </Link>
          <Link href="/terms" className="font-medium underline-offset-2 hover:underline">
            {t("legal.terms")}
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-refuted/40 bg-paper-raised p-6">
        <p className="t-label flex items-center gap-2 text-refuted">
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
          {t("delete.title")}
        </p>
        <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{t("delete.lead")}</p>

        <form onSubmit={remove} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-medium sm:max-w-[340px]">
            {t("delete.confirmLabel")}
            <Input type="email" autoComplete="off" placeholder={email} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={deleting} />
          </label>
          <Button
            type="submit"
            variant="secondary"
            className="min-h-11 border-refuted text-refuted hover:bg-refuted hover:text-paper"
            disabled={deleting || confirmation.trim().toLowerCase() !== email.toLowerCase()}
          >
            {deleting ? t("delete.confirming") : t("delete.cta")}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper p-3 text-sm text-refuted">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

export default function AccountPage() {
  return <Account session={useAppSession()} />;
}
