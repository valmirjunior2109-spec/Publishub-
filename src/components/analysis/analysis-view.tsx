"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { ProcessingTimeline } from "./processing-timeline";
import { CategoryCard } from "./category-card";
import { MetricsPanel } from "./metrics-panel";
import { ScoreRing } from "@/components/ui/score-ring";
import { ButtonLink } from "@/components/ui/button";
import type { AnalysisPayload } from "@/lib/analysis/get-analysis";

const POLL_INTERVAL_MS = 1500;

export function AnalysisView({ analysisId, initial }: { analysisId: string; initial: AnalysisPayload }) {
  const [data, setData] = useState<AnalysisPayload>(initial);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (data.status === "DONE" || data.status === "FAILED") return;

    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/analyses/${analysisId}`);
        if (!response.ok) return;
        const next: AnalysisPayload = await response.json();
        setData(next);
        if (next.status === "DONE" || next.status === "FAILED") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // transient network error — keep polling on the next tick
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [analysisId, data.status]);

  if (data.status === "FAILED") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-danger/25 bg-danger/5 p-10 text-center">
        <AlertTriangle size={28} className="text-danger" />
        <div>
          <p className="font-medium text-foreground">Não foi possível concluir esta análise</p>
          <p className="mt-1 text-sm text-muted">{data.error || "Ocorreu um erro inesperado durante o processamento."}</p>
        </div>
        <ButtonLink href="/new" variant="secondary">
          Tentar novamente
        </ButtonLink>
      </div>
    );
  }

  if (data.status !== "DONE" || !data.result || !data.metrics) {
    return (
      <div className="flex flex-col items-center gap-8 rounded-card border border-border bg-surface p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary-strong">
          <Sparkles size={24} />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Analisando {data.video.fileName}</p>
          <p className="mt-1 text-sm text-muted">Isso costuma levar menos de um minuto.</p>
        </div>
        <div className="w-full max-w-xs">
          <ProcessingTimeline currentStage={data.stage} />
        </div>
      </div>
    );
  }

  const { result, metrics } = data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-6 rounded-card border border-border bg-surface p-8 text-center sm:p-10">
        <ScoreRing score={result.overallScore} label="pontuação geral" size={140} />
        <p className="max-w-xl text-balance text-lg font-medium text-foreground">{result.headline}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {result.categories.map((category) => (
          <CategoryCard key={category.key} category={category} />
        ))}
      </div>

      <MetricsPanel metrics={metrics} />

      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
        <ButtonLink href="/new" size="lg">
          Analisar outro vídeo
        </ButtonLink>
        <ButtonLink href="/" variant="ghost" size="lg">
          Voltar ao início
        </ButtonLink>
      </div>
    </div>
  );
}
