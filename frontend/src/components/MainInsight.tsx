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
  const topRecommendation = rewrite ? null : (result.copilot?.recommendations?.[0] ?? null);
  const recommendation = topRecommendation ? recommendationText(topRecommendation) : null;

  return (
    <Reveal as="section" className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
      {/* o segundo, o que a retenção fez nele e a frase dita ali */}
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
        <div className="shrink-0">
          <h2 className="t-label tracking-[0.08em]">{t(estimated ? "insight.eyebrowEstimated" : "insight.eyebrow")}</h2>
          <button
            type="button"
            onClick={() => onSeek(result.drop.at_seconds)}
            className="mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] text-accent hover:opacity-80"
            aria-label={t("insight.play", { time: dropTime })}
          >
            {dropTime}
          </button>
        </div>
        <div className="min-w-0 flex-1 basis-[260px]">
          <p className="t-label tracking-[0.08em]">{t("insight.happening")}</p>
          <blockquote className="mt-1.5 border-l-[3px] border-accent pl-3.5 text-[16.5px] leading-snug">&ldquo;{result.phrase.text}&rdquo;</blockquote>
          <button
            type="button"
            onClick={() => onSeek(result.phrase.start_seconds)}
            className="mt-1 inline-flex min-h-8 items-center gap-1.5 text-[12.5px] font-medium tabular-nums text-ink-muted hover:text-ink"
          >
            <span aria-hidden="true" className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-accent" />
            {formatTimestamp(result.phrase.start_seconds)} → {formatTimestamp(result.phrase.end_seconds)}
          </button>
        </div>
      </div>

      {/* por que pode estar custando gente: hipótese, não certeza */}
      <div className="mt-4 border-t border-line pt-4">
        <p className="t-label tracking-[0.08em]">{t("insight.why")}</p>
        <p className="mt-1.5 text-[15px] leading-relaxed">{result.diagnosis}</p>
        {measured && (
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {t("insight.eventMeasured", { from: Math.round(result.drop.retained_before as number), to: Math.round(result.drop.retained_after as number) })}
          </p>
        )}
        {!measured && result.drop.reason && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{result.drop.reason}</p>}
        {result.hypothesis && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">{t("transcript.hypothesisLabel")}:</span> {result.hypothesis}
          </p>
        )}
      </div>

      {/* o que testar no lugar */}
      {(rewrite || recommendation) && (
        <div className="mt-4 rounded-xl border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.05)] p-4">
          <p className="t-label tracking-[0.08em] !text-accent">{t("insight.test")}</p>
          {rewrite ? (
            <>
              <p className="mt-1.5 font-display text-[17px] font-medium leading-snug tracking-[-0.01em]">&ldquo;{rewrite.text}&rdquo;</p>
              {rewrite.why && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{rewrite.why}</p>}
            </>
          ) : (
            recommendation &&
            topRecommendation && (
              <>
                <p className="mt-1.5 font-display text-[16.5px] font-medium leading-snug tracking-[-0.01em]">
                  <button type="button" onClick={() => onSeek(topRecommendation.at_seconds)} className="mr-2 font-semibold tabular-nums text-accent hover:opacity-80">
                    {formatTimestamp(topRecommendation.at_seconds)}
                  </button>
                  {recommendation.title}
                </p>
                {recommendation.action && <p className="mt-1 text-[13.5px] leading-relaxed">{recommendation.action}</p>}
              </>
            )
          )}
        </div>
      )}

      {estimated && <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">{t("estimated.lead")}</p>}
    </Reveal>
  );
}
