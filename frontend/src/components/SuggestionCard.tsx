"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Minus, Play, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { SuggestionStatus } from "@/components/SuggestionTimeline";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { CutConfidence } from "@/lib/types";

/** Passo dos botões de ajuste: fino o bastante para acertar a emenda, grosso o bastante para o dedo. */
const STEP = 0.25;
/** O menor trecho que ainda vale cortar (o backend recusa abaixo disso). */
const MIN_LENGTH = 0.3;

export interface SuggestionCardProps {
  /** Onde o card mora na lista (a linha do tempo rola até ele). */
  anchor: number;
  /** "Corte sugerido #1" ou "Seu corte". */
  label: string;
  status: SuggestionStatus;
  /** Aceito com o trecho mudado pelo criador. */
  edited: boolean;
  /** Criado pelo criador, não sugerido. */
  manual: boolean;
  start: number;
  end: number;
  /** O trecho como a IA sugeriu: para voltar a ele depois de ajustar. */
  original: { start: number; end: number } | null;
  duration: number;
  /** Por que cortar, em uma ou duas linhas. */
  reason: string;
  confidence: CutConfidence | null;
  /** O sinal medido por trás da confiança ("92% do trecho é silêncio medido"). */
  evidence: string | null;
  /** "Também apontado como: pausa longa" — a sobreposição resolvida num card só. */
  merged: string | null;
  /** Este corte sobrepõe outro aceito: ao aplicar, viram um trecho só. */
  overlap: string | null;
  selected: boolean;
  /** O player está tocando esta sugestão agora. */
  playing: "original" | "cut" | null;
  onSelect: () => void;
  onPlayOriginal: () => void;
  onPlayResult: () => void;
  onDecide: (status: SuggestionStatus) => void;
  onAdjust: (start: number, end: number) => void;
  /** Fechou o ajuste: é aí que conta como "editou a sugestão". */
  onAdjustDone: () => void;
  /** Novo corte: já abre o ajuste, porque o trecho ainda é um chute. */
  startAdjusting?: boolean;
}

const round = (value: number) => Math.round(value * 100) / 100;
/* 0:03.50 — o ajuste precisa do centésimo, que o formatTimestamp comum não mostra. */
const precise = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;

const CONFIDENCE_STYLE: Record<CutConfidence, string> = {
  high: "border-[rgba(var(--accent-rgb),0.4)] bg-accent-soft text-accent",
  medium: "border-[rgba(192,138,46,0.4)] bg-[rgba(192,138,46,0.1)] text-pending",
  low: "border-line bg-transparent text-ink-muted",
};

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
 * Um corte: o trecho, quanto sai, por que a IA (ou a medida) sugere tirar, com que
 * confiança — e o que o criador faz com ele: comparar original e resultado,
 * aceitar, rejeitar ou ajustar. Tocar de novo na decisão marcada volta a sugestão
 * para "sugerido".
 */
export function SuggestionCard(props: SuggestionCardProps) {
  const { anchor, label, status, edited, manual, start, end, original, duration, reason, confidence, evidence, merged, overlap, selected, playing } = props;
  const t = useTranslations("Analysis.review");
  const [adjusting, setAdjusting] = useState(Boolean(props.startAdjusting));
  const length = Math.max(0, end - start);
  const visual = status === "accepted" && edited ? "edited" : status;

  const decisionButton = "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px";
  const previewButton = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors";

  return (
    <li
      data-suggestion={anchor}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-paper py-3.5 pl-5 pr-4 transition-[border-color,box-shadow,opacity] duration-200 sm:pr-5",
        selected ? "border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)]" : "border-line",
        status === "rejected" && !selected && "opacity-70",
      )}
      onClick={props.onSelect}
    >
      {/* a cor da decisão, na borda: dá para varrer a lista sem ler */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-colors",
          visual === "accepted" || visual === "edited" ? "bg-accent" : visual === "rejected" ? "bg-[rgba(var(--ink-rgb),0.2)]" : "bg-[rgba(var(--accent-rgb),0.35)]",
        )}
      />

      {/* ---------- o trecho, quanto sai e com que confiança, numa linha ---------- */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={cn("font-display text-[16px] font-bold tabular-nums tracking-tight", status === "accepted" && "pen-strike")}>
          <span className="sr-only">{label}: </span>
          {formatTimestamp(start)} → {formatTimestamp(end)}
        </p>
        <p className="text-[13px] font-medium tabular-nums text-ink-muted">−{t("card.seconds", { seconds: length.toFixed(1) })}</p>
        {(manual || edited) && <span className="rounded-full bg-[rgba(var(--ink-rgb),0.06)] px-2 py-0.5 text-[11.5px] font-semibold text-ink-muted">{manual ? t("status.manual") : t("status.edited")}</span>}
        {confidence && <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[11px] font-semibold", CONFIDENCE_STYLE[confidence])}>{t(`confidence.${confidence}`)}</span>}
      </div>

      {/* ---------- por quê, e o que sustenta a sugestão ---------- */}
      <p className={cn("mt-1.5 text-[14px] leading-relaxed", status === "rejected" && "text-ink-muted line-through decoration-[rgba(var(--ink-rgb),0.3)]")}>{reason}</p>
      {(evidence || merged) && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{[evidence, merged].filter(Boolean).join(" ")}</p>}

      {overlap && (
        <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-[rgba(192,138,46,0.35)] bg-[rgba(192,138,46,0.08)] p-2.5 text-[12.5px] leading-relaxed text-pending">
          <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
          {overlap}
        </p>
      )}

      {/* ---------- comparar (o mesmo pedaço com e sem o corte) e decidir ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={props.onPlayOriginal}
          aria-pressed={playing === "original"}
          className={cn(previewButton, playing === "original" ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink hover:border-ink-muted")}
        >
          <Play size={13} strokeWidth={2.25} aria-hidden="true" />
          {t("compare.original")}
        </button>
        <button
          type="button"
          onClick={props.onPlayResult}
          aria-pressed={playing === "cut"}
          className={cn(previewButton, playing === "cut" ? "border-accent bg-accent text-paper-raised" : "border-[rgba(var(--accent-rgb),0.4)] bg-paper-raised text-accent hover:border-accent")}
        >
          <Play size={13} strokeWidth={2.25} aria-hidden="true" />
          {t("compare.result")}
        </button>

        <span className="flex basis-full items-center gap-2 sm:ml-auto sm:basis-auto">
          {!manual && (
            <button
              type="button"
              onClick={() => props.onDecide(status === "accepted" ? "pending" : "accepted")}
              aria-pressed={status === "accepted"}
              className={cn(decisionButton, status === "accepted" ? "border-accent bg-accent text-paper-raised" : "border-line bg-paper-raised text-ink hover:border-accent hover:text-accent")}
            >
              <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              {status === "accepted" ? t("actions.accepted") : t("actions.accept")}
            </button>
          )}
          {manual ? (
            <button type="button" onClick={() => props.onDecide("pending")} className={cn(decisionButton, "border-line bg-paper-raised text-ink hover:border-refuted hover:text-refuted")}>
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
              {t("actions.remove")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => props.onDecide(status === "rejected" ? "pending" : "rejected")}
              aria-pressed={status === "rejected"}
              className={cn(decisionButton, status === "rejected" ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink hover:border-ink-muted")}
            >
              <X size={14} strokeWidth={2.5} aria-hidden="true" />
              {status === "rejected" ? t("actions.rejected") : t("actions.reject")}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (adjusting) props.onAdjustDone();
              setAdjusting((open) => !open);
            }}
            aria-expanded={adjusting}
            aria-label={t("actions.adjust")}
            title={t("actions.adjust")}
            className={cn(decisionButton, "px-2.5", adjusting ? "border-ink text-ink" : "border-transparent text-ink-muted hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink")}
          >
            <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      </div>

      {adjusting && (
        <div className="fade-in mt-4 flex flex-col gap-2.5 rounded-lg border border-line bg-paper-raised p-3.5" onClick={(event) => event.stopPropagation()}>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">{manual ? t("adjust.leadManual") : t("adjust.lead")}</p>
          <Stepper label={t("adjust.start")} value={start} min={0} max={end - MIN_LENGTH} onChange={(value) => props.onAdjust(value, end)} />
          <Stepper label={t("adjust.end")} value={end} min={start + MIN_LENGTH} max={duration > 0 ? duration : end + 60} onChange={(value) => props.onAdjust(start, value)} />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            {original && edited ? (
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
