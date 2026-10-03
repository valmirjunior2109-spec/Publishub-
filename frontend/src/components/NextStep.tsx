"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Gem } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Button, buttonClasses } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/events";
import { OFFER } from "@/lib/pricing";
import { usePolling } from "@/lib/usePolling";
import type { Me } from "@/lib/types";

/* "missing": disse que não foi útil e está vendo o "o que faltou?" */
type FeedbackState = "ask" | "missing" | "thanks";

/* A resposta fica no navegador só para não perguntar de novo a quem já respondeu;
   a resposta de verdade está no banco (POST /api/analyses/{id}/feedback). */
function readAnswered(analysisId: string): boolean {
  try {
    return window.localStorage.getItem(`publishub.feedback.${analysisId}`) === "1";
  } catch {
    return false;
  }
}

function rememberAnswered(analysisId: string) {
  try {
    window.localStorage.setItem(`publishub.feedback.${analysisId}`, "1");
  } catch {
    // sem localStorage a pergunta volta na próxima visita; nada quebra
  }
}

/** "Essa análise foi útil?" — Sim / Não muito, e só no "não" o "o que faltou?". */
function AnalysisFeedback({ analysisId }: { analysisId: string }) {
  const t = useTranslations("Analysis.feedback");
  // esta tela só existe depois que a análise chega pelo cliente: sem HTML do servidor para divergir
  const [state, setState] = useState<FeedbackState>(() => (readAnswered(analysisId) ? "thanks" : "ask"));
  const [missing, setMissing] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(useful: boolean, note: string | null) {
    setFailed(false);
    setSending(true);
    try {
      await apiFetch(`/api/analyses/${analysisId}/feedback`, { method: "POST", body: { useful, missing: note } });
      rememberAnswered(analysisId);
      setState("thanks");
    } catch {
      setFailed(true);
    }
    setSending(false);
  }

  if (state === "thanks") {
    return <p className="text-[13.5px] text-ink-muted">{t("thanks")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[14.5px] font-medium">{t("question")}</p>
        {state === "ask" && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="min-h-10 px-4" disabled={sending} onClick={() => send(true, null)}>
              {t("yes")}
            </Button>
            <Button variant="secondary" size="sm" className="min-h-10 px-4" disabled={sending} onClick={() => setState("missing")}>
              {t("no")}
            </Button>
          </div>
        )}
      </div>

      {state === "missing" && (
        <form
          className="flex max-w-[560px] flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(false, missing.trim() || null);
          }}
        >
          <label htmlFor="feedback-missing" className="text-[13.5px] text-ink-muted">
            {t("missingLabel")}
          </label>
          <textarea
            id="feedback-missing"
            value={missing}
            onChange={(event) => setMissing(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("missingPlaceholder")}
            className="w-full rounded-sm border border-line bg-paper-raised px-3 py-2 text-[14px] leading-relaxed text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" className="min-h-10 px-4" disabled={sending}>
              {t("send")}
            </Button>
          </div>
        </form>
      )}

      {failed && (
        <p role="alert" className="text-[13px] text-refuted">
          {t("error")}
        </p>
      )}
    </div>
  );
}

/**
 * Depois do valor, o próximo passo: dizer se a análise foi útil, analisar o
 * próximo vídeo e, no plano grátis, a oferta de Founding Creator.
 *
 * `showOffer` fica falso quando a tela já tem um checkout (a análise parcial com
 * o plano bloqueado): a mesma oferta duas vezes na mesma página é pressão, não ajuda.
 */
export function NextStep({ analysisId, showOffer }: { analysisId: string; showOffer: boolean }) {
  const t = useTranslations("Analysis.nextStep");
  const { data: me } = usePolling<Me>("/api/me", { shouldPoll: () => false });
  const plan = me?.entitlement;
  const free = plan?.plan === "free" && plan.free_analyses_limit !== null;
  const offer = showOffer && free && plan?.billing_configured;

  return (
    <section className="border-t border-line pt-6">
      <AnalysisFeedback analysisId={analysisId} />

      <div className={`mt-6 grid gap-4 ${offer ? "md:grid-cols-2" : ""}`}>
        {/* a mesma pergunta, no próximo vídeo */}
        <div className="flex flex-col justify-between gap-5 rounded-md border border-line bg-paper-raised p-5 sm:p-6">
          <div>
            <h2 className="font-display text-[22px] font-medium tracking-[-0.01em]">{t("title")}</h2>
            <p className="mt-2 max-w-[48ch] text-[14.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/nova-analise" onClick={() => track("next_analysis_clicked", analysisId, { plan: plan?.plan ?? "unknown" })} className={buttonClasses("primary", "md", "min-h-11")}>
              {t("cta")}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            {free && plan && (
              <span className="text-[13px] text-ink-muted">
                {plan.free_analyses_remaining ? t("remaining", { count: plan.free_analyses_remaining }) : t("noneRemaining")}
              </span>
            )}
          </div>
        </div>

        {/* Founding Creator: só no grátis, com o checkout que já existe */}
        {offer && (
          <div className="flex flex-col justify-between gap-5 rounded-md border border-[rgba(var(--accent-rgb),0.35)] bg-paper-raised p-5 sm:p-6">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-accent">
                <Gem size={14} strokeWidth={1.75} aria-hidden="true" />
                {t("offerEyebrow")}
              </p>
              <h2 className="mt-2 font-display text-[22px] font-medium tracking-[-0.01em]">{t("offerTitle")}</h2>
              <p className="mt-2 max-w-[48ch] text-[14.5px] leading-relaxed text-ink-muted">{t("offerLead")}</p>
            </div>
            <div>
              <CheckoutButton where="next_step" analysisId={analysisId} className={buttonClasses("secondary", "md", "min-h-11 w-full sm:w-auto")}>
                {t("offerCta", { price: OFFER.display })}
              </CheckoutButton>
              <p className="mt-2 text-[12.5px] text-ink-muted">{t("offerNote")}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
