"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Followup } from "@/lib/types";

interface RepublishPlanProps {
  followup: Followup | null;
  /** Agenda o lembrete. Lança ApiError em caso de falha. */
  onSchedule: (republishOn: string | null) => Promise<void>;
  errorMessage?: string | null;
}

/**
 * "Quando você vai republicar?" — o passo que transforma a análise em loop.
 * A data é opcional: sem ela o lembrete sai em 72 h; com ela, 48 h depois dela.
 */
export function RepublishPlan({ followup, onSchedule, errorMessage }: RepublishPlanProps) {
  const t = useTranslations("Analysis.republish");
  const format = useFormatter();
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const scheduled = followup?.status === "scheduled";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSchedule(date || null);
    } finally {
      setSaving(false);
    }
  }

  if (scheduled) {
    const when = followup?.send_after ? format.dateTime(new Date(followup.send_after), { day: "numeric", month: "short" }) : null;
    return (
      <section className="rounded-md border border-line bg-paper-raised p-6">
        <p className="t-label">{t("scheduledLabel")}</p>
        <p className="mt-2 text-[15px] leading-relaxed">{when ? t("scheduled", { date: when }) : t("scheduledNoDate")}</p>
        <button type="button" onClick={() => onSchedule(null)} className="mt-3 text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
          {t("change")}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-line bg-paper-raised p-6">
      <p className="t-label">{t("eyebrow")}</p>
      <h2 className="mt-2 font-display text-[22px] font-medium leading-tight tracking-tight">{t("title")}</h2>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-ink-muted">{t("lead")}</p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("dateLabel")}
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} className="max-w-[200px]" />
        </label>
        <Button type="submit" className="min-h-11" disabled={saving}>
          {date ? t("submitWithDate") : t("submit")}
        </Button>
      </form>
      <p className="mt-3 text-[12.5px] text-ink-muted">{t("note")}</p>

      {errorMessage && (
        <p role="alert" className="mt-3 text-[13px] text-refuted">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
