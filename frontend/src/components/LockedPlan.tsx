"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { ActionPlan } from "@/components/ActionPlan";
import { CheckoutButton } from "@/components/CheckoutButton";
import { EmailCapture } from "@/components/EmailCapture";
import { buttonClasses } from "@/components/ui/Button";
import { useTrackOnce } from "@/lib/events";
import { OFFER } from "@/lib/pricing";
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
 * veio do backend. Pagar leva o id da análise ao Stripe, e o webhook abre o resto.
 */
export function LockedPlan({ recommendations, lockedCount, analysisId, onSeek, askEmail }: LockedPlanProps) {
  const t = useTranslations("Analysis.lockedPlan");
  useTrackOnce("paywall_viewed", lockedCount > 0, analysisId, { where: "plan", locked_items: lockedCount });

  return (
    <section className="mt-16">
      {recommendations.length > 0 && <ActionPlan recommendations={recommendations} analysisId={analysisId} onSeek={onSeek} />}

      {lockedCount > 0 && (
        <div className="relative mt-4 min-h-[330px]">
          {/* o lugar das recomendações que ficaram no servidor: barras, sem texto para ler */}
          <ol aria-hidden="true" className="flex flex-col gap-3 blur-[4px]">
            {Array.from({ length: Math.min(lockedCount, 4) }).map((_, index) => (
              <li key={index} className="flex gap-4 rounded-md border border-line bg-paper-raised p-5">
                <span className="h-4 w-8 rounded-sm bg-ink/15" />
                <div className="flex flex-1 flex-col gap-2">
                  <span className="h-3.5 w-8/12 rounded-sm bg-ink/15" />
                  <span className="h-3 w-11/12 rounded-sm bg-ink/10" />
                </div>
              </li>
            ))}
          </ol>

          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-[460px] rounded-md border border-line bg-paper-raised/95 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
              <span aria-hidden="true" className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-line text-ink-muted">
                <Lock size={16} strokeWidth={1.75} />
              </span>
              <p className="mt-3.5 text-center font-display text-[19px] font-medium leading-snug tracking-tight">{t("title", { count: lockedCount })}</p>
              <p className="mt-2 text-center text-[13.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
              <CheckoutButton where="plan" analysisId={analysisId} className={buttonClasses("primary", "md", "mt-5 min-h-12 w-full px-6")}>
                {t("cta", { price: OFFER.display })}
              </CheckoutButton>
              <p className="mt-2.5 text-center text-[12px] text-ink-muted">{t("once")}</p>
            </div>
          </div>
        </div>
      )}

      {askEmail && <EmailCapture analysisId={analysisId} />}
    </section>
  );
}
