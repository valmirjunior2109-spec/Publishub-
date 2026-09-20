"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatTimestamp } from "@/lib/format";
import type { BlindPrediction as Blind } from "@/lib/types";

interface BlindPredictionProps {
  blind: Blind;
  /** Grava a resposta no backend. Lança ApiError em caso de falha. */
  onRespond: (response: "hit" | "miss", actualSeconds: number | null) => Promise<void>;
  /** "Enviar print para análise completa" — leva para o upload ou para o cadastro. */
  onSendScreenshot: () => void;
  errorMessage?: string | null;
}

/**
 * A aposta antes do print: "aposto que você perde gente em 0:04, enquanto diz…".
 * A pessoa abre o Insights e diz se acertamos. Errar por até um segundo conta
 * como acerto — é o backend que decide, aqui só se mostra o veredito.
 */
export function BlindPrediction({ blind, onRespond, onSendScreenshot, errorMessage }: BlindPredictionProps) {
  const t = useTranslations("Analysis.blind");
  const [correcting, setCorrecting] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const time = formatTimestamp(blind.at_seconds);
  const answered = blind.response !== null;

  async function send(response: "hit" | "miss", actualSeconds: number | null) {
    setSaving(true);
    try {
      await onRespond(response, actualSeconds);
    } finally {
      setSaving(false);
    }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seconds = Number(draft.replace(",", "."));
    if (!Number.isFinite(seconds) || seconds < 0) return;
    await send("miss", Math.round(seconds * 10) / 10);
  }

  return (
    <section className="rounded-md border border-[rgba(var(--accent-rgb),0.3)] bg-accent-soft p-6 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-label text-accent">{t("eyebrow")}</p>
        {answered && <Badge tone={blind.hit ? "confirmed" : "refuted"}>{t(blind.hit ? "hitTag" : "missTag")}</Badge>}
      </div>

      <p className="mt-4 text-[17px] leading-[1.5] sm:text-[19px]">{t("statement", { time })}</p>
      {blind.phrase && <blockquote className="t-quote mt-4 border-l-[3px] border-accent pl-5">&ldquo;{blind.phrase}&rdquo;</blockquote>}

      {!answered ? (
        <>
          <p className="mt-6 text-[14px] leading-relaxed text-ink-muted">{t("check")}</p>
          {!correcting ? (
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              {/* mobile primeiro: botões de largura cheia, empilhados, com alvo de toque grande */}
              <Button className="min-h-12 w-full sm:w-auto sm:px-7" disabled={saving} onClick={() => send("hit", null)}>
                {t("hit")}
              </Button>
              <Button variant="secondary" className="min-h-12 w-full sm:w-auto" disabled={saving} onClick={() => setCorrecting(true)}>
                {t("miss")}
              </Button>
              <Button variant="ghost" className="min-h-12 w-full sm:w-auto" disabled={saving} onClick={onSendScreenshot}>
                {t("withScreenshot")}
              </Button>
            </div>
          ) : (
            <form onSubmit={submitCorrection} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {t("missLabel")}
                <div className="relative max-w-[180px]">
                  <Input
                    autoFocus
                    inputMode="decimal"
                    placeholder={t("missPlaceholder")}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={saving}
                    className="pr-8"
                    aria-label={t("missLabel")}
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                    s
                  </span>
                </div>
              </label>
              <div className="flex gap-2">
                <Button type="submit" className="min-h-11" disabled={draft.trim() === "" || saving}>
                  {t("send")}
                </Button>
                <Button type="button" variant="ghost" className="min-h-11" disabled={saving} onClick={() => setCorrecting(false)}>
                  {t("back")}
                </Button>
              </div>
            </form>
          )}
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">{t("tolerance", { seconds: blind.tolerance_seconds })}</p>
        </>
      ) : (
        <p className="mt-6 text-[15px] leading-relaxed">
          {blind.hit
            ? t("verdictHit", { time: formatTimestamp(blind.actual_seconds ?? blind.at_seconds) })
            : t("verdictMiss", { time: formatTimestamp(blind.actual_seconds ?? 0), predicted: time })}
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="mt-4 rounded-sm border border-refuted bg-paper p-3 text-sm text-refuted">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
