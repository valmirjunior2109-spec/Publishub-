"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Download, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { CutSegment, Recommendation, VideoEdit } from "@/lib/types";

interface CutsPanelProps {
  /** Os cortes que a análise sugere, na ordem do vídeo. */
  suggested: CutSegment[];
  /** A edição já pedida para esta análise, se houver. */
  edit: VideoEdit | null;
  /** O plano inteiro: é dele que sai o motivo de cada corte. */
  recommendations: Recommendation[];
  filename: string;
  onApply: (cuts: CutSegment[]) => Promise<void>;
  onSeek: (seconds: number) => void;
  errorMessage?: string | null;
}

const RUNNING = new Set(["pending", "processing"]);

/** O mesmo trecho no plano: o título e o porquê que o criador já leu lá em cima. */
function explain(cut: CutSegment, recommendations: Recommendation[]): Recommendation | undefined {
  return recommendations.find(
    (item) => Math.abs(item.at_seconds - cut.start_seconds) < 0.05 && item.end_seconds != null && Math.abs(item.end_seconds - cut.end_seconds) < 0.05,
  );
}

/** O nome do arquivo baixado, e o pedido para o Storage entregar como download. */
function downloadHref(url: string, filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "") || "video";
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("download", base + "-publishub.mp4");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Os cortes: o Publishub aponta os trechos, o criador marca o que sai e aprova.
 *
 * Nada acontece com o vídeo antes de aplicar — e nem depois, no original: o que
 * sai daqui é uma versão nova, para assistir e baixar, ao lado do arquivo que a
 * pessoa enviou.
 */
export function CutsPanel({ suggested, edit, recommendations, filename, onApply, onSeek, errorMessage }: CutsPanelProps) {
  const t = useTranslations("Analysis.cuts");
  const tErrors = useTranslations("Errors.cuts");
  // guardamos o que foi DESmarcado: os cortes chegam do backend depois do primeiro
  // render, e começar com tudo marcado não pode depender dessa ordem.
  const [unchecked, setUnchecked] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  // depois de uma edição pronta, escolher de novo é um passo explícito
  const [reopening, setReopening] = useState(false);

  const running = Boolean(edit && RUNNING.has(edit.status));
  const cuts = useMemo(() => suggested.filter((_, index) => !unchecked.includes(index)), [unchecked, suggested]);
  const seconds = cuts.reduce((total, cut) => total + (cut.end_seconds - cut.start_seconds), 0);

  if (suggested.length === 0 && !edit) return null;

  async function apply() {
    setApplying(true);
    try {
      await onApply(cuts);
      setReopening(false);
    } catch {
      // a mensagem vem por errorMessage; a lista continua como estava
    } finally {
      setApplying(false);
    }
  }

  function toggle(index: number) {
    setUnchecked((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]));
  }

  const showList = suggested.length > 0 && !running && (reopening || !edit || edit.status === "failed");

  return (
    <section className="mt-16 rounded-md border border-line bg-paper-raised p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="t-label tracking-[0.08em]">{t("label")}</p>
          <h2 className="mt-2 font-display text-[22px] font-medium leading-tight tracking-[-0.01em]">{t("title")}</h2>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </div>
        <Badge tone="neutral">
          <Scissors size={12} strokeWidth={1.75} aria-hidden="true" />
          {t("safe")}
        </Badge>
      </div>

      {showList && (
        <>
          <ul className="mt-6 flex flex-col">
            {suggested.map((cut, index) => {
              const item = explain(cut, recommendations);
              const checked = !unchecked.includes(index);
              return (
                <li key={`${cut.start_seconds}-${cut.end_seconds}`} className="border-t border-line py-4 last:border-b">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(index)}
                      aria-pressed={checked}
                      aria-label={t("toggle", { time: formatTimestamp(cut.start_seconds) })}
                      className={cn("mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-sm border", checked ? "border-ink bg-ink text-paper" : "border-line")}
                    >
                      {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onSeek(cut.start_seconds)}
                        className="inline-flex flex-wrap items-center gap-1.5 font-display text-[15px] font-semibold tabular-nums tracking-tight hover:text-accent"
                      >
                        <span aria-hidden="true" className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-accent" />
                        {formatTimestamp(cut.start_seconds)} → {formatTimestamp(cut.end_seconds)}
                        <span className="font-normal text-ink-muted">{t("length", { seconds: Number((cut.end_seconds - cut.start_seconds).toFixed(1)) })}</span>
                      </button>
                      {item?.title && <p className={cn("mt-1.5 text-[14.5px] leading-relaxed", !checked && "text-ink-muted")}>{item.title}</p>}
                      {item?.why && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{item.why}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button className="min-h-11" onClick={apply} disabled={applying || cuts.length === 0}>
              {applying ? t("applying") : t("apply", { count: cuts.length })}
            </Button>
            <p className="text-[13px] text-ink-muted">{cuts.length === 0 ? t("nothingChosen") : t("summary", { seconds: Number(seconds.toFixed(1)) })}</p>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">{t("note")}</p>
        </>
      )}

      {running && (
        <div className="mt-6 flex items-center gap-3 rounded-sm border border-line bg-paper p-4" aria-live="polite" aria-busy="true">
          <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-ink" />
          <p className="text-[14px]">{t("processing")}</p>
        </div>
      )}

      {edit?.status === "failed" && (
        <p role="alert" className="mt-6 rounded-sm border border-refuted bg-paper p-3 text-[13.5px] text-refuted">
          {edit.error_code && tErrors.has(edit.error_code as "generic") ? tErrors(edit.error_code as "generic") : tErrors("generic")}
        </p>
      )}

      {edit?.status === "completed" && (
        <div className="mt-7 grid items-start gap-7 sm:grid-cols-[minmax(0,200px)_1fr]">
          <VideoPlayer src={edit.download_url} fallback={t("noPreview")} />
          <div>
            <p className="t-label">{t("ready.label")}</p>
            <p className="mt-2 font-display text-[18px] leading-snug tracking-[-0.01em]">
              {t("ready.title", {
                removed: Number((edit.removed_seconds ?? 0).toFixed(1)),
                from: formatTimestamp(edit.original_duration_seconds ?? 0),
                to: formatTimestamp(edit.duration_seconds ?? 0),
              })}
            </p>
            <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-muted">{t("ready.lead")}</p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] tabular-nums text-ink-muted">
              {(edit.kept ?? []).map((piece) => (
                <li key={`${piece.start_seconds}-${piece.end_seconds}`}>
                  {formatTimestamp(piece.start_seconds)} → {formatTimestamp(piece.end_seconds)}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {edit.download_url && (
                <a
                  href={downloadHref(edit.download_url, filename)}
                  download
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink bg-ink px-4 text-[14px] font-medium text-paper hover:no-underline hover:opacity-90"
                >
                  <Download size={15} strokeWidth={1.75} aria-hidden="true" />
                  {t("download")}
                </a>
              )}
              {!showList && (
                <button type="button" onClick={() => setReopening(true)} className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                  {t("again")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="mt-5 rounded-sm border border-refuted bg-paper p-3 text-[13.5px] text-refuted">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
