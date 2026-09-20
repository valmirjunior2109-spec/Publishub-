"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { AnalysisStatus, AnalysisStep } from "@/lib/types";

/** A ordem real das etapas no backend (`analyses.step`). */
const ORDER: Array<Exclude<AnalysisStep, null>> = ["transcribing", "aligning", "diagnosing"];

type StepState = "done" | "active" | "todo";

/**
 * Etapas reais, vindas do backend (`step`) — nada simulado com timers.
 *
 * São quatro estágios na tela e três no banco porque transcrever e ler o print
 * acontecem ao mesmo tempo (é o que deixou a análise duas vezes mais rápida).
 * Então as duas linhas ficam ativas juntas, o que é o que de fato acontece.
 */
export function ProcessingSteps({ status, step, withInsights = true }: { status: AnalysisStatus; step: AnalysisStep; withInsights?: boolean }) {
  const t = useTranslations("Analysis.processing");
  const current = step ? ORDER.indexOf(step) : -1;
  const done = status === "completed";

  function stateOf(index: number): StepState {
    if (done || index < current) return "done";
    return index === current ? "active" : "todo";
  }

  const rows: Array<{ key: string; state: StepState }> = [
    { key: "received", state: "done" },
    { key: "transcribing", state: stateOf(0) },
    // lendo a curva: roda junto da transcrição, e só existe quando há print
    ...(withInsights ? [{ key: "readingChart", state: stateOf(0) }] : []),
    { key: withInsights ? "aligning" : "estimating", state: stateOf(1) },
    { key: "writing", state: stateOf(2) },
    { key: "ready", state: done ? "done" : "todo" },
  ];

  return (
    <Card className="flex flex-col gap-6" aria-live="polite">
      <div>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-2 font-display text-[26px] font-medium tracking-tight">{status === "pending" ? t("queuedTitle") : withInsights ? t("title") : t("titleVideoOnly")}</h2>
        <p className="mt-2 max-w-[56ch] text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <ol className="flex flex-col">
        {rows.map((row) => (
          <li
            key={row.key}
            className={cn(
              "flex items-center gap-3 border-t border-line py-3 text-[14.5px] last:border-b",
              row.state === "active" ? "font-medium text-ink" : "text-ink-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                row.state === "done" ? "border-ink bg-ink" : row.state === "active" ? "border-ink" : "border-line",
              )}
            >
              {row.state === "done" && <span className="h-2 w-1 -translate-y-px rotate-45 border-b-[1.5px] border-r-[1.5px] border-paper-raised" />}
              {row.state === "active" && <span className="h-2.5 w-2.5 animate-spin rounded-full border border-line border-t-ink" />}
            </span>
            {t(`steps.${row.key}` as "steps.received")}
          </li>
        ))}
      </ol>
    </Card>
  );
}
