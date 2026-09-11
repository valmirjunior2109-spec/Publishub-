"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoMetrics } from "@/lib/ai/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-2">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MetricsPanel({ metrics }: { metrics: VideoMetrics }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-foreground">Métricas técnicas</span>
        <ChevronDown size={16} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border px-5 py-5 sm:grid-cols-4">
          <Stat label="Duração" value={formatDuration(metrics.durationSec)} />
          <Stat label="Resolução" value={metrics.width && metrics.height ? `${metrics.width}×${metrics.height}` : "—"} />
          <Stat label="FPS" value={metrics.fps ? metrics.fps.toFixed(1) : "—"} />
          <Stat label="Cortes detectados" value={String(metrics.cuts.count)} />
          <Stat label="Cortes por minuto" value={metrics.cuts.perMinute.toFixed(1)} />
          <Stat label="Primeiro corte" value={metrics.cuts.firstCutSec !== null ? `${metrics.cuts.firstCutSec.toFixed(1)}s` : "—"} />
          <Stat label="Silêncio total" value={`${metrics.silence.silencePct.toFixed(1)}%`} />
          <Stat label="Maior pausa" value={`${metrics.silence.longestSilenceSec.toFixed(1)}s`} />
          <Stat label="Volume médio" value={metrics.loudness.meanVolumeDb !== null ? `${metrics.loudness.meanVolumeDb.toFixed(1)}dB` : "—"} />
          <Stat label="Pico de volume" value={metrics.loudness.maxVolumeDb !== null ? `${metrics.loudness.maxVolumeDb.toFixed(1)}dB` : "—"} />
          <Stat label="Legendas" value={metrics.captions ? `${metrics.captions.cueCount} cues` : "não enviadas"} />
          <Stat label="Cobertura de legendas" value={metrics.captions ? `${metrics.captions.coveragePct.toFixed(0)}%` : "—"} />
        </div>
      )}
    </div>
  );
}
