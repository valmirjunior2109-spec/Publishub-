"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface TimelineItem {
  start: number;
  end: number;
  status: SuggestionStatus;
  /** Aceito com o trecho mudado pelo criador (ajustado ou feito à mão). */
  edited?: boolean;
}

interface SuggestionTimelineProps {
  duration: number;
  items: TimelineItem[];
  selected: number | null;
  /** Onde o player está agora, em segundos. */
  playhead: number;
  /** O segundo em que a retenção cai: a sugestão faz sentido perto dele. */
  dropAt?: number | null;
  onSelect: (index: number) => void;
  onSeek: (seconds: number) => void;
}

const STYLE: Record<SuggestionStatus, string> = {
  // pendente: contorno, ainda é só uma sugestão
  pending: "border-2 border-accent bg-[rgba(var(--accent-rgb),0.18)]",
  // aceito: cheio, é o que vai sair do vídeo
  accepted: "border-2 border-accent bg-accent",
  // rejeitado: apagado, fica no vídeo
  rejected: "border-2 border-dashed border-[rgba(var(--ink-rgb),0.25)] bg-[rgba(var(--ink-rgb),0.06)]",
};

/* editado: sai do vídeo como o aceito, com listras para mostrar que o trecho é do criador */
const EDITED = "border-2 border-accent bg-accent bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.28)_0_4px,transparent_4px_9px)]";

/**
 * O vídeo inteiro numa barra: cada corte sugerido no lugar dele, com a cor do que
 * o criador decidiu. Tocar num trecho seleciona a sugestão; tocar no resto da barra
 * leva o player até aquele segundo.
 */
export function SuggestionTimeline({ duration, items, selected, playhead, dropAt, onSelect, onSeek }: SuggestionTimelineProps) {
  const t = useTranslations("Analysis.review.timeline");
  const total = Math.max(duration, ...items.map((item) => item.end), 0.1);
  const at = (seconds: number) => `${Math.min(100, Math.max(0, (seconds / total) * 100))}%`;

  function seekFromClick(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(total, ((event.clientX - box.left) / box.width) * total)));
  }

  function seekFromKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") onSeek(Math.min(total, playhead + 1));
    if (event.key === "ArrowLeft") onSeek(Math.max(0, playhead - 1));
  }

  return (
    <div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t("label")}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(playhead)}
        aria-valuetext={formatTimestamp(playhead)}
        onClick={seekFromClick}
        onKeyDown={seekFromKeys}
        className="relative h-12 w-full cursor-pointer overflow-hidden rounded-lg border border-line bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {/* marcas de 25% em 25%: dá escala sem poluir */}
        {[25, 50, 75].map((mark) => (
          <span key={mark} aria-hidden="true" className="absolute inset-y-0 w-px bg-line" style={{ left: `${mark}%` }} />
        ))}

        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(index);
            }}
            aria-label={t("segment", { index: index + 1, from: formatTimestamp(item.start), to: formatTimestamp(item.end), status: t(`status.${item.status === "accepted" && item.edited ? "edited" : item.status}`) })}
            aria-pressed={selected === index}
            className={cn(
              "absolute inset-y-1.5 min-w-[8px] rounded-md transition-[background-color,border-color,box-shadow] duration-200",
              item.status === "accepted" && item.edited ? EDITED : STYLE[item.status],
              selected === index && "shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.35)]",
            )}
            style={{ left: at(item.start), width: `calc(${at(item.end)} - ${at(item.start)})` }}
          />
        ))}

        {/* a queda de retenção: o motivo de olhar para esta região */}
        {dropAt != null && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0 border-l-2 border-dashed border-refuted" style={{ left: at(dropAt) }} />
        )}

        {/* onde o player está */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink transition-[left] duration-150 ease-linear" style={{ left: at(playhead) }} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] tabular-nums text-ink-muted">
        <span>0:00</span>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border-2 border-accent bg-[rgba(var(--accent-rgb),0.18)]" />
            {t("status.pending")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-accent" />
            {t("status.accepted")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-accent bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.35)_0_2px,transparent_2px_4px)]" />
            {t("status.edited")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-[rgba(var(--ink-rgb),0.3)]" />
            {t("status.rejected")}
          </span>
          {dropAt != null && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-0 border-l-2 border-dashed border-refuted" />
              {t("drop")}
            </span>
          )}
        </div>
        <span>{formatTimestamp(total)}</span>
      </div>
    </div>
  );
}
