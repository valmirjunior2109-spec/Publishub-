"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { track } from "@/lib/events";
import { useSession } from "@/lib/session";
import { useErrorText } from "@/lib/useErrorText";
import type { Entitlement, PurchaseStatus } from "@/lib/types";

type State =
  | { kind: "idle" } // sem session_id na URL: página genérica
  | { kind: "checking" }
  | { kind: "activating" }
  | { kind: "paid"; emailMasked: string | null }
  | { kind: "notPaid" }
  | { kind: "error"; message?: string };

/**
 * Para onde o Stripe manda depois do pagamento (?session_id=cs_…).
 *  - Logado: confirma a sessão no backend e cai no painel com o acesso liberado.
 *  - Sem login: mostra para qual e-mail o pagamento foi confirmado e pede a conta.
 */
export function ThankYou() {
  const t = useTranslations("ThankYou");
  const tb = useTranslations("Billing.thanks");
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { loading, session } = useSession();
  const router = useRouter();
  const errorText = useErrorText();
  const [state, setState] = useState<State>(sessionId ? { kind: "checking" } : { kind: "idle" });

  useEffect(() => {
    if (!sessionId || loading) return;
    let cancelled = false;
    (async () => {
      try {
        if (session) {
          setState({ kind: "activating" });
          await apiFetch<{ entitlement: Entitlement }>("/api/billing/confirm", { method: "POST", body: { session_id: sessionId } });
          track("purchased");
          if (!cancelled) router.replace("/dashboard?ativado=1");
          return;
        }
        const status = await apiFetch<PurchaseStatus>(`/api/billing/session/${encodeURIComponent(sessionId)}`);
        if (!cancelled) setState(status.paid ? { kind: "paid", emailMasked: status.email_masked } : { kind: "notPaid" });
      } catch (err) {
        if (cancelled) return;
        const api = err instanceof ApiError ? err : null;
        if (api && (api.code === "NOT_PAID" || api.code === "SESSION_NOT_FOUND")) setState({ kind: "notPaid" });
        else setState({ kind: "error", message: api ? errorText(api) : undefined });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loading, session, router, errorText]);

  const busy = state.kind === "checking" || state.kind === "activating";

  return (
    <div className="stagger">
      <LogoMark size={40} />
      <p className="t-label mt-8">{t("eyebrow")}</p>
      <h1 className="t-display-l mt-3">{t("title")}</h1>

      {busy && (
        <p className="mt-6 flex items-center gap-3 text-[15px] text-ink-muted" aria-busy="true">
          <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-accent" />
          {state.kind === "activating" ? tb("activating") : tb("checking")}
        </p>
      )}

      {state.kind === "paid" && (
        <>
          <p className="t-body-l mt-6">{tb("confirmedFor", { email: state.emailMasked ?? "" })}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{tb("createWith")}</p>
        </>
      )}
      {state.kind === "idle" && <p className="t-body-l mt-6 text-ink-muted">{t("lead")}</p>}
      {state.kind === "notPaid" && (
        <p role="alert" className="mt-6 rounded-sm border border-pending bg-paper-raised p-3 text-sm text-pending">
          {tb("notPaid")}
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="mt-6 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
          {state.message || tb("error")}
        </p>
      )}

      {!busy && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonClasses("primary", "md")}>
            {t("cta")}
          </Link>
          <Link href="/login" className={buttonClasses("secondary", "md")}>
            {t("secondary")}
          </Link>
        </div>
      )}

      <div className="mt-10 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
        <p>{t("receipt")}</p>
        <p className="mt-1">{t("support")}</p>
      </div>
    </div>
  );
}
