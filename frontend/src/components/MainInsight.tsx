"use client";

import { useTranslations } from "next-intl";
import { useRecommendationText } from "@/components/ActionPlan";
import { Reveal } from "@/components/Reveal";
import { formatTimestamp } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

interface MainInsightProps {
  result: AnalysisResult;
  onSeek: (seconds: number) => void;
}

/**
 * O que mudar neste vídeo, numa leitura só: o segundo, o que a retenção fez ali,
 * o que estava acontecendo, por que isso pode custar gente e o que testar no lugar.
 *
 * Nada aqui é inventado na tela: é o que a análise devolveu (a queda, a frase, o
 * diagnóstico e a primeira reescrita). Sem as reescritas (análise parcial), o
 * "o que testar" é a recomendação de maior impacto que veio aberta.
 */
export function MainInsight({ result, onSeek }: MainInsightProps) {
  const t = useTranslations("Analysis");
  const recommendationText = useRecommendationText();
  const estimated = result.retention_source === "estimated";
  const dropTime = formatTimestamp(result.drop.at_seconds);
  const measured = result.drop.retained_before !== null && result.drop.retained_after !== null;

  const rewrite = result.rewrites[0] ?? null;
  // o plano já vem ordenado por impacto: o primeiro item é a mudança que vem antes de todas
  const topRecommendation = result.copilot?.recommendations?.[0] ?? null;
  const recommendation = topRecommendation ? recommendationText(topRecommendation) : null;

  return (
    <Reveal as="section" className="overflow-hidden rounded-md border border-line bg-paper-raised">
      {/* o segundo e o que a retenção fez nele */}
      <div className="border-b border-line bg-[rgba(var(--accent-rgb),0.06)] p-5 sm:p-7">
        <h2 className="t-label tracking-[0.08em]">{t(estimated ? "insight.eyebrowEstimated" : "insight.eyebrow")}</h2>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <button type="button" onClick={() => onSeek(result.drop.at_seconds)} className="t-display-xl text-accent hover:opacity-80" aria-label={t("insight.play", { time: dropTime })}>
            {dropTime}
          </button>
          <p className="text-[15px] font-medium leading-snug">
            {measured
              ? t("insight.eventMeasured", { from: Math.round(result.drop.retained_before as number), to: Math.round(result.drop.retained_after as number) })
              : t("insight.eventEstimated")}
          </p>
        </div>
        {!measured && result.drop.reason && <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-muted">{result.drop.reason}</p>}
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-7">
        {/* o que estava acontecendo: a frase dita naquele segundo */}
        <div>
          <p className="t-label mb-2.5 tracking-[0.08em]">{t("insight.happening")}</p>
          <blockquote className="border-l-[3px] border-accent pl-4 text-[17px] leading-snug">&ldquo;{result.phrase.text}&rdquo;</blockquote>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
            {result.phrase.before && <span className="italic">…{result.phrase.before}</span>}
            <button type="button" onClick={() => onSeek(result.phrase.start_seconds)} className="inline-flex min-h-9 items-center gap-1.5 font-medium text-ink-muted hover:text-ink">
              <span aria-hidden="true" className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-accent" />
              {formatTimestamp(result.phrase.start_seconds)} → {formatTimestamp(result.phrase.end_seconds)}
            </button>
          </div>
        </div>

        {/* por que pode estar custando gente: hipótese, não certeza */}
        <div>
          <p className="t-label mb-2.5 tracking-[0.08em]">{t("insight.why")}</p>
          <p className="t-body-l">{result.diagnosis}</p>
          {result.hypothesis && (
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">{t("transcript.hypothesisLabel")}:</span> {result.hypothesis}
            </p>
          )}
        </div>

        {/* o que testar no lugar */}
        {(rewrite || recommendation) && (
          <div className="rounded-md border border-[rgba(var(--accent-rgb),0.3)] bg-paper p-4 sm:p-5">
            <p className="t-label mb-2.5 tracking-[0.08em] !text-accent">{t("insight.test")}</p>
            {rewrite ? (
              <>
                <p className="font-display text-[18px] font-medium leading-snug tracking-[-0.01em]">&ldquo;{rewrite.text}&rdquo;</p>
                {rewrite.why && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{rewrite.why}</p>}
              </>
            ) : (
              recommendation &&
              topRecommendation && (
                <>
                  <p className="font-display text-[17px] font-medium leading-snug tracking-[-0.01em]">
                    <button type="button" onClick={() => onSeek(topRecommendation.at_seconds)} className="mr-2 font-semibold tabular-nums text-accent hover:opacity-80">
                      {formatTimestamp(topRecommendation.at_seconds)}
                    </button>
                    {recommendation.title}
                  </p>
                  {recommendation.action && <p className="mt-2 text-[14px] leading-relaxed">{recommendation.action}</p>}
                </>
              )
            )}
          </div>
        )}

        {/* com a reescrita no lugar do "o que testar", a ação concreta de maior impacto vem numa linha */}
        {rewrite && recommendation && topRecommendation && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-5 sm:flex-row sm:gap-3">
            <p className="t-label shrink-0 tracking-[0.08em] sm:pt-0.5">{t("insight.fixFirst")}</p>
            <div className="min-w-0">
              <p className="text-[15px] font-medium leading-snug">
                <button type="button" onClick={() => onSeek(topRecommendation.at_seconds)} className="mr-2 font-semibold tabular-nums text-accent hover:opacity-80">
                  {formatTimestamp(topRecommendation.at_seconds)}
                </button>
                {recommendation.title}
              </p>
              {recommendation.action && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{recommendation.action}</p>}
            </div>
          </div>
        )}

        {estimated && <p className="text-[12.5px] leading-relaxed text-ink-muted">{t("estimated.lead")}</p>}
      </div>
    </Reveal>
  );
}
