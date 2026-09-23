"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { supportMailto } from "@/lib/support";
import type { Entitlement } from "@/lib/types";

/** O que só o servidor pode dizer. O resto (sem sessão, sem session_id) se lê da URL. */
type Confirmation = "confirming" | "ready" | "problem";

/**
 * Para onde o Stripe manda depois do pagamento (?session_id=cs_…).
 *
 * A comemoração é a parte fácil; o que importa aqui é liberar o acesso. Com
 * sessão, a confirmação é feita no servidor (que pergunta ao Stripe) e a conta
 * já entra liberada. Sem sessão, o pagamento continua valendo — o webhook
 * registrou — e basta entrar com o e-mail do pagamento.
 */
export function PaymentSuccess() {
  const t = useTranslations("Success");
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { loading, session } = useSession();
  const [confirmation, setConfirmation] = useState<Confirmation>(sessionId ? "confirming" : "ready");

  // a sessão venceu (ou a compra foi feita sem conta): o pagamento continua valendo
  const signedOut = Boolean(sessionId) && !loading && !session;
  const state = signedOut ? "signedOut" : confirmation;

  useEffect(() => {
    if (!sessionId || loading || !session) return;
    let cancelled = false;
    (async () => {
      try {
        // a confirmação é server-side: esta tela nunca decide sozinha que alguém pagou
        await apiFetch<{ entitlement: Entitlement }>("/api/billing/confirm", { method: "POST", body: { session_id: sessionId } });
        if (!cancelled) setConfirmation("ready");
      } catch (err) {
        // o webhook pode chegar depois; a compra não se perde, só a confirmação imediata
        if (!cancelled) setConfirmation(err instanceof ApiError && err.status === 404 ? "problem" : "ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loading, session]);

  return (
    <div className="stagger">
      <LogoMark size={40} />
      <h1 className="t-display-l mt-8">{t("title")}</h1>
      <p className="t-body-l mt-4">{t("welcome")}</p>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-muted">{t("lead")}</p>

      {state === "confirming" && (
        <p className="mt-6 flex items-center gap-3 text-[15px] text-ink-muted" aria-busy="true">
          <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-accent" />
          {t("checking")}
        </p>
      )}

      {state === "signedOut" && <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">{t("signedOut")}</p>}

      {state === "problem" && (
        <p role="alert" className="mt-6 rounded-sm border border-pending bg-paper-raised p-3 text-sm text-pending">
          {t("problem")}
        </p>
      )}

      {state !== "confirming" && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={state === "signedOut" ? "/login" : "/nova-analise"} className={buttonClasses("primary", "md", "min-h-12 px-6 text-[15px]")}>
            {state === "signedOut" ? t("signIn") : `${t("cta")} →`}
          </Link>
          {state === "problem" && (
            <a href={supportMailto("Publishub: paguei e o acesso não liberou")} className="text-[13.5px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
              {t("support")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
