"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Play, Plus, SkipForward, SlidersHorizontal, X } from "lucide-react";
import type { SuggestionStatus } from "@/components/SuggestionTimeline";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";

/** Passo dos botões de ajuste: fino o bastante para acertar a emenda, grosso o bastante para o dedo. */
const STEP = 0.25;
/** O menor trecho que ainda vale cortar (o backend recusa abaixo disso). */
const MIN_LENGTH = 0.3;

export interface SuggestionCardProps {
  index: number;
  status: SuggestionStatus;
  start: number;
  end: number;
  /** O trecho como a IA sugeriu: para mostrar o ajuste e poder voltar a ele. */
  original: { start: number; end: number };
  adjusted: boolean;
  duration: number;
  kind: string | null;
  title: string | null;
  why: string | null;
  selected: boolean;
  /** O player está tocando esta sugestão agora. */
  playing: "segment" | "cut" | null;
  onSelect: () => void;
  onPlaySegment: () => void;
  onPreviewCut: () => void;
  onDecide: (status: SuggestionStatus) => void;
  onAdjust: (start: number, end: number) => void;
  /** Fechou o ajuste: é aí que conta como "editou a sugestão". */
  onAdjustDone: () => void;
}

const round = (value: number) => Math.round(value * 100) / 100;
/* 0:03.5 — o ajuste precisa do décimo, que o formatTimestamp comum não mostra. */
const precise = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) {
  const t = useTranslations("Analysis.review.adjust");
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(round(Math.max(min, value - STEP)))}
          disabled={value - STEP < min - 0.001}
          aria-label={t("earlier", { what: label })}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-paper-raised text-ink transition-colors hover:border-ink-muted disabled:opacity-40"
        >
          <Minus size={14} strokeWidth={2} aria-hidden="true" />
        </button>
        <span className="w-[68px] text-center font-display text-[14px] font-semibold tabular-nums">{precise(value)}</span>
        <button
          type="button"
          onClick={() => onChange(round(Math.min(max, value + STEP)))}
          disabled={value + STEP > max + 0.001}
          aria-label={t("later", { what: label })}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-paper-raised text-ink transition-colors hover:border-ink-muted disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Uma sugestão de corte: o trecho, por que a IA sugere tirar, e o que o criador
 * pode fazer com ela — ver, pré-visualizar, aceitar, rejeitar ou ajustar.
 * Tocar de novo na decisão que já está marcada volta a sugestão para pendente.
 */
export function SuggestionCard(props: SuggestionCardProps) {
  const { index, status, start, end, original, adjusted, duration, kind, title, why, selected, playing } = props;
  const t = useTranslations("Analysis.review");
  const tKinds = useTranslations("Analysis.plan.kinds");
  const [adjusting, setAdjusting] = useState(false);
  const length = Math.max(0, end - start);

  const decisionButton = "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px";
  const toolButton = "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink";

  return (
    <li
      data-suggestion={index}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-paper p-4 transition-[border-color,box-shadow,opacity] duration-200 sm:p-5",
        selected ? "border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)]" : "border-line",
        status === "rejected" && !selected && "opacity-70",
      )}
      onClick={props.onSelect}
    >
      {/* a cor da decisão, na borda: dá para varrer a lista sem ler */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1 transition-colors", status === "accepted" ? "bg-accent" : status === "rejected" ? "bg-[rgba(var(--ink-rgb),0.2)]" : "bg-[rgba(var(--accent-rgb),0.35)]")}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-display text-[12px] font-bold tabular-nums text-ink-muted">#{index + 1}</span>
        <span className="font-display text-[15.5px] font-semibold tabular-nums tracking-tight">
          {formatTimestamp(start)} → {formatTimestamp(end)}
        </span>
        <span className="text-[12.5px] tabular-nums text-ink-muted">{t("length", { seconds: Number(length.toFixed(1)) })}</span>
        {kind && <span className="rounded-md bg-[rgba(var(--ink-rgb),0.06)] px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-muted">{tKinds(kind as "cut")}</span>}
        <span
          className={cn(
            "ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
            status === "accepted" ? "bg-accent-soft text-accent" : status === "rejected" ? "bg-[rgba(var(--ink-rgb),0.06)] text-ink-muted" : "bg-[rgba(192,138,46,0.12)] text-pending",
          )}
        >
          {t(`status.${status}`)}
          {adjusted && status === "accepted" ? ` · ${t("adjustedTag")}` : ""}
        </span>
      </div>

      {title && <p className={cn("mt-2 text-[14.5px] font-medium leading-snug", status === "rejected" && "text-ink-muted line-through decoration-[rgba(var(--ink-rgb),0.3)]")}>{title}</p>}
      {why && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{why}</p>}

      <div className="mt-3.5 flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={props.onPlaySegment} className={cn(toolButton, playing === "segment" && "text-accent")} aria-pressed={playing === "segment"}>
          <Play size={14} strokeWidth={2} aria-hidden="true" />
          {t("actions.watch")}
        </button>
        <button type="button" onClick={props.onPreviewCut} className={cn(toolButton, playing === "cut" && "text-accent")} aria-pressed={playing === "cut"}>
          <SkipForward size={14} strokeWidth={2} aria-hidden="true" />
          {t("actions.preview")}
        </button>

        <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />

        <button
          type="button"
          onClick={() => props.onDecide(status === "accepted" ? "pending" : "accepted")}
          aria-pressed={status === "accepted"}
          className={cn(decisionButton, status === "accepted" ? "border-accent bg-accent text-paper-raised" : "border-line bg-paper-raised text-ink hover:border-accent hover:text-accent")}
        >
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
          {status === "accepted" ? t("actions.accepted") : t("actions.accept")}
        </button>
        <button
          type="button"
          onClick={() => props.onDecide(status === "rejected" ? "pending" : "rejected")}
          aria-pressed={status === "rejected"}
          className={cn(decisionButton, status === "rejected" ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink hover:border-ink-muted")}
        >
          <X size={14} strokeWidth={2.5} aria-hidden="true" />
          {status === "rejected" ? t("actions.rejected") : t("actions.reject")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (adjusting) props.onAdjustDone();
            setAdjusting((open) => !open);
          }}
          aria-expanded={adjusting}
          className={cn(toolButton, adjusting && "text-ink")}
        >
          <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
          {t("actions.adjust")}
        </button>
      </div>

      {adjusting && (
        <div className="fade-in mt-4 flex flex-col gap-2.5 rounded-lg border border-line bg-paper-raised p-3.5" onClick={(event) => event.stopPropagation()}>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">{t("adjust.lead")}</p>
          <Stepper label={t("adjust.start")} value={start} min={0} max={end - MIN_LENGTH} onChange={(value) => props.onAdjust(value, end)} />
          <Stepper label={t("adjust.end")} value={end} min={start + MIN_LENGTH} max={duration > 0 ? duration : end + 60} onChange={(value) => props.onAdjust(start, value)} />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            {adjusted ? (
              <button type="button" onClick={() => props.onAdjust(original.start, original.end)} className="text-[12.5px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                {t("adjust.reset", { from: formatTimestamp(original.start), to: formatTimestamp(original.end) })}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => {
                props.onAdjustDone();
                setAdjusting(false);
              }}
              className="inline-flex min-h-9 items-center rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-paper hover:opacity-90"
            >
              {t("adjust.done")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
