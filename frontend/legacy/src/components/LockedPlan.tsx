"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { ActionPlan } from "@/components/ActionPlan";
import { EmailCapture } from "@/components/EmailCapture";
import { PlanOptions } from "@/components/PlanOptions";
import { buttonClasses } from "@/components/ui/Button";
import { track, useTrackOnce } from "@/lib/events";
import type { Recommendation } from "@/lib/types";

interface LockedPlanProps {
  /** As recomendações grátis: as únicas que o backend mandou. */
  recommendations: Recommendation[];
  /** Quantas ficaram no servidor. Só o número chega aqui, nunca o texto. */
  lockedCount: number;
  analysisId: string;
  onSeek: (seconds: number) => void;
  /** Convidado não tem conta nem e-mail conhecido: é para ele o "te mando no e-mail". */
  askEmail: boolean;
}

/**
 * O plano de uma análise grátis: as primeiras recomendações abertas e o lugar das
 * outras, bloqueadas.
 *
 * Os cartões bloqueados são desenhados sem texto nenhum: o conteúdo deles não
 * veio do backend. Pagar leva o id da análise ao Stripe; quem abre o resto é o
 * backend, depois que o Stripe confirma (o Founder marca esta análise como paga;
 * a assinatura abre todas as análises da conta enquanto estiver ativa).
 */
export function LockedPlan({ recommendations, lockedCount, analysisId, onSeek, askEmail }: LockedPlanProps) {
  const t = useTranslations("Analysis.lockedPlan");
  useTrackOnce("paywall_viewed", lockedCount > 0, analysisId, { where: "plan", locked_items: lockedCount });

  return (
    <section>
      {recommendations.length > 0 && <ActionPlan recommendations={recommendations} analysisId={analysisId} onSeek={onSeek} />}

      {lockedCount > 0 && (
        // o rascunho e o cartão dividem a mesma célula da grade: a altura é a do maior,
        // então as opções de plano nunca vazam por cima do que vem depois (no celular, o cartão é o mais alto)
        <div className="mt-4 grid">
          {/* o lugar das recomendações que ficaram no servidor: barras, sem texto para ler */}
          <ol aria-hidden="true" className="col-start-1 row-start-1 flex flex-col gap-3 self-start blur-[4px]">
            {Array.from({ length: Math.min(lockedCount, 4) }).map((_, index) => (
              <li key={index} className="flex gap-4 rounded-xl border border-line bg-paper-raised p-4 sm:p-5">
                <span className="h-4 w-8 rounded-sm bg-ink/15" />
                <div className="flex flex-1 flex-col gap-2">
                  <span className="h-3.5 w-8/12 rounded-sm bg-ink/15" />
                  <span className="h-3 w-11/12 rounded-sm bg-ink/10" />
                </div>
              </li>
            ))}
          </ol>

          <div className="col-start-1 row-start-1 grid place-items-center p-4">
            <div className="w-full max-w-[480px] rounded-xl border border-line bg-paper-raised/95 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
              <span aria-hidden="true" className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-line text-ink-muted">
                <Lock size={16} strokeWidth={1.75} />
              </span>
              <p className="mt-3.5 text-center font-display text-[17px] font-medium leading-snug tracking-tight">{t("title", { count: lockedCount })}</p>
              {askEmail ? (
                // convidado: a conta grátis abre esta análise inteira (guest_service.claim); pagar continua ali embaixo
                <>
                  <p className="mt-2 text-center text-[13.5px] leading-relaxed text-ink-muted">{t("guestLead")}</p>
                  <div className="mt-4 flex justify-center">
                    <Link href="/signup" onClick={() => track("signup_started", analysisId, { where: "locked_plan" })} className={buttonClasses("primary", "md", "max-sm:min-h-11")}>
                      {t("signup")}
                    </Link>
                  </div>
                  <p className="mt-5 text-center text-[12.5px] text-ink-muted">{t("orPay")}</p>
                  <PlanOptions where="plan" analysisId={analysisId} className="mt-2 text-center" />
                </>
              ) : (
                <>
                  <p className="mt-2 text-center text-[13.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
                  <PlanOptions where="plan" analysisId={analysisId} className="mt-5 text-center" />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {askEmail && <EmailCapture analysisId={analysisId} />}
    </section>
  );
}
