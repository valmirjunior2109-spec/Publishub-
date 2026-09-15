"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatTimestamp } from "@/lib/format";
import type { Accuracy, AnalysisResult, LoopOutcome } from "@/lib/types";

interface PredictionLoopProps {
  /** Só existe quando a análise veio com o print da retenção (a página não renderiza o loop sem ela). */
  prediction: NonNullable<AnalysisResult["prediction"]>;
  dropAtSec: number;
  outcome: LoopOutcome;
  actualRetention: number | null;
  recordedAt: string | null;
  accuracy: Accuracy | null;
  /** Grava o número real no backend. Lança ApiError em caso de falha. */
  onRecord: (actual: number) => Promise<void>;
  errorMessage?: string | null;
}

/**
 * O loop de previsão (layout do Figma): a aposta da IA de um lado, o que o
 * Insights mostrou do outro, o veredito embaixo e a acurácia no canto.
 */
export function PredictionLoop({ prediction, dropAtSec, outcome, actualRetention, recordedAt, accuracy, onRecord, errorMessage }: PredictionLoopProps) {
  const t = useTranslations("Analysis.loop");
  const tStatus = useTranslations("Status");
  const format = useFormatter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const diff = actualRetention === null ? 0 : Math.abs(Math.round(actualRetention - prediction.predicted));
  const verdictLine =
    outcome === "confirmed" ? (diff === 0 ? t("verdict.confirmedExact") : t("verdict.confirmed", { diff })) : outcome === "refuted" ? t("verdict.refuted", { diff }) : t("verdict.pending");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    setSaving(true);
    try {
      await onRecord(Math.round(value * 10) / 10);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-md border border-line bg-paper-raised p-6 sm:p-12">
      {/* cabeçalho + acurácia */}
      <div className="mb-9 flex flex-wrap items-start justify-between gap-8">
        <div>
          <h2 className="font-display text-[28px] font-medium tracking-[-0.01em]">{t("title")}</h2>
          <p className="mt-2 max-w-[480px] text-[15px] leading-[1.6] text-ink-muted">{t("lead")}</p>
        </div>
        {accuracy && accuracy.total > 0 && (
          <div className="shrink-0 text-right">
            <p className="t-label">{t("accuracy.label")}</p>
            <p className="mt-1 font-display text-[48px] font-medium leading-none tabular-nums tracking-[-0.02em]">{accuracy.rate}%</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">{t("accuracy.count", { count: accuracy.total })}</p>
          </div>
        )}
      </div>

      {/* previsão | o que o Insights mostrou */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-line bg-paper p-6">
          <p className="t-label mb-3">{t("aiPrediction")}</p>
          <p className="text-[15px] leading-[1.6]">
            {t.rich("statement", {
              time: formatTimestamp(dropAtSec),
              second: prediction.at_second,
              baseline: Math.round(prediction.baseline),
              predicted: Math.round(prediction.predicted),
              ts: (chunks) => <span className="font-display font-semibold">{chunks}</span>,
              b: (chunks) => <strong className="font-display font-semibold">{chunks}</strong>,
            })}
          </p>
          <p className="mt-4 border-t border-line pt-3 font-display text-[40px] font-semibold leading-none tabular-nums tracking-tight">
            {Math.round(prediction.predicted)}%
            <span className="ml-2 text-[13px] font-normal tracking-normal text-ink-muted">{t("predicted")}</span>
          </p>
        </div>

        <div className="rounded-md border border-line bg-paper p-6">
          <p className="t-label mb-3">{t("insightsShowed")}</p>
          {outcome === "pending" ? (
            <form onSubmit={submit}>
              <label htmlFor="actual-retention" className="block text-[14px] leading-relaxed">
                {t("inputLabel", { second: prediction.at_second })}
              </label>
              <div className="relative mt-3 max-w-[220px]">
                <Input id="actual-retention" inputMode="decimal" placeholder={t("inputPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} className="pr-8" disabled={saving} />
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                  %
                </span>
              </div>
              <div className="mt-3.5">
                <Button type="submit" variant="secondary" size="sm" disabled={draft.trim() === "" || saving}>
                  {t("verify")}
                </Button>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-muted">{t("hint")}</p>
              {errorMessage && (
                <p role="alert" className="mt-3 text-[13px] text-refuted">
                  {errorMessage}
                </p>
              )}
            </form>
          ) : (
            <>
              <p className={`font-display text-[40px] font-semibold leading-none tabular-nums tracking-tight ${outcome === "confirmed" ? "text-confirmed" : "text-refuted"}`}>
                {Math.round(actualRetention ?? 0)}%
                <span className="ml-2 text-[13px] font-normal tracking-normal text-ink-muted">{t("actual")}</span>
              </p>
              {recordedAt && <p className="mt-3 text-[12px] text-ink-muted">{t("recordedOn", { date: format.dateTime(new Date(recordedAt), { day: "numeric", month: "short" }) })}</p>}
            </>
          )}
        </div>
      </div>

      {/* veredito */}
      {outcome !== "pending" && (
        <div
          className={`mt-7 flex flex-wrap items-center gap-4 rounded-md border px-6 py-[18px] ${
            outcome === "confirmed" ? "border-[rgba(92,107,74,0.3)] bg-[rgba(92,107,74,0.06)]" : "border-[rgba(138,90,78,0.3)] bg-[rgba(138,90,78,0.06)]"
          }`}
        >
          <Badge tone={outcome}>{tStatus(outcome)}</Badge>
          <span className="text-[15px] leading-[1.5]">
            {outcome === "confirmed" ? t("verdict.confirmedNote") : t("verdict.refutedNote")} <span className="text-ink-muted">{verdictLine}</span>
          </span>
        </div>
      )}
    </section>
  );
}
