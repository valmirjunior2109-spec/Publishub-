"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { LoopStatus, Prediction } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";

interface PredictionLoopProps {
  prediction: Prediction;
  dropAtSec: number;
  /** Acurácia acumulada de todas as análises (vem das fixtures). */
  accuracy: { confirmed: number; total: number; rate: number | null };
}

function verdictFor(predicted: number, actual: number | null): LoopStatus {
  if (actual === null) return "pending";
  return actual >= predicted ? "confirmed" : "refuted";
}

/**
 * O loop previsão → resultado. O criador cola o número real depois de
 * republicar; o veredito é calculado aqui, no cliente, só para esta etapa.
 */
export function PredictionLoop({ prediction, dropAtSec, accuracy }: PredictionLoopProps) {
  const t = useTranslations("Analysis.loop");
  const tStatus = useTranslations("Status");
  const format = useFormatter();

  const [draft, setDraft] = useState("");
  const [actual, setActual] = useState<number | null>(prediction.actual);
  const [recordedAt, setRecordedAt] = useState<Date | null>(prediction.recordedAt ? new Date(prediction.recordedAt) : null);

  const status = verdictFor(prediction.predicted, actual);
  const diff = actual === null ? 0 : Math.abs(actual - prediction.predicted);

  // Se o resultado foi registrado agora, a acurácia acumulada já reflete isso.
  const stats =
    prediction.status === "pending" && status !== "pending"
      ? {
          confirmed: accuracy.confirmed + (status === "confirmed" ? 1 : 0),
          total: accuracy.total + 1,
        }
      : { confirmed: accuracy.confirmed, total: accuracy.total };
  const rate = stats.total === 0 ? null : Math.round((stats.confirmed / stats.total) * 100);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    setActual(Math.round(value));
    setRecordedAt(new Date());
  }

  const verdictText =
    status === "pending"
      ? t("verdict.pending")
      : status === "confirmed"
        ? diff === 0
          ? t("verdict.confirmedExact")
          : t("verdict.confirmed", { diff })
        : t("verdict.refuted", { diff });

  const actualTone = status === "confirmed" ? "text-confirmed" : status === "refuted" ? "text-refuted" : "text-ink-muted";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-medium tracking-tight sm:text-[28px]">{t("title")}</h2>
          <p className="mt-2 max-w-[56ch] text-sm text-ink-muted">{t("lead")}</p>
        </div>
        <Badge tone={status} dot>
          {tStatus(status)}
        </Badge>
      </div>

      <p className="mt-6 max-w-[60ch] text-[15px] leading-relaxed">
        {t.rich("statement", {
          time: formatTimestamp(dropAtSec),
          second: prediction.atSecond,
          baseline: prediction.baseline,
          predicted: prediction.predicted,
          ts: (chunks) => <span className="font-display font-semibold">{chunks}</span>,
          b: (chunks) => <strong className="font-display font-semibold">{chunks}</strong>,
        })}
      </p>

      {actual === null && (
        <form onSubmit={submit} className="mt-6 border-t border-line pt-6">
          <label htmlFor="actual-retention" className="block text-sm font-medium">
            {t("inputLabel", { second: prediction.atSecond })}
          </label>
          <div className="mt-2 flex max-w-sm gap-2">
            <div className="relative flex-1">
              <Input
                id="actual-retention"
                inputMode="decimal"
                placeholder={t("inputPlaceholder")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="pr-8"
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                %
              </span>
            </div>
            <Button type="submit" disabled={draft.trim() === ""}>
              {t("submit")}
            </Button>
          </div>
          <p className="mt-2 text-[13px] text-ink-muted">{t("hint")}</p>
        </form>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6">
        <div>
          <p className="eyebrow">{t("predicted")}</p>
          <p className="mt-2 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight sm:text-[52px]">
            {prediction.predicted}%
          </p>
        </div>
        <div>
          <p className="eyebrow">{t("actual")}</p>
          <p className={`mt-2 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight sm:text-[52px] ${actualTone}`}>
            {actual === null ? "—" : `${actual}%`}
          </p>
          {actual === null && <p className="mt-1 text-xs text-ink-muted">{t("waiting")}</p>}
        </div>
      </div>

      <p className="mt-4 text-sm">
        <span className={status === "pending" ? "text-ink-muted" : "font-medium"}>{verdictText}</span>
        {recordedAt && (
          <span className="text-ink-muted"> · {t("recordedOn", { date: format.dateTime(recordedAt, { day: "numeric", month: "short" }) })}</span>
        )}
      </p>

      <div className="mt-8 border-t border-line pt-6">
        <p className="eyebrow">{t("accuracy.label")}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-display text-[36px] font-bold leading-none tabular-nums tracking-tight">{rate === null ? "—" : `${rate}%`}</span>
          <span className="text-sm text-ink-muted">
            {rate === null ? t("accuracy.none") : t("accuracy.detail", { confirmed: stats.confirmed, total: stats.total })}
          </span>
        </div>
        <div className="mt-3 h-1 w-full max-w-xs bg-line" aria-hidden="true">
          <div className="h-full bg-confirmed transition-[width] duration-300" style={{ width: `${rate ?? 0}%` }} />
        </div>
      </div>
    </Card>
  );
}
