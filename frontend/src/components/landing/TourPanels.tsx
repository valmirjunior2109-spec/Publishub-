import { getTranslations } from "next-intl/server";
import { Check, Download, Upload, X } from "lucide-react";
import type { TourStep } from "@/components/landing/ProductTour";
import { ReelFrame } from "@/components/landing/ReelFrame";
import { MockButton } from "@/components/landing/Section";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Analysis } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";

interface Line {
  time: string;
  text: string;
}

/* Os trechos que saem no exemplo (em segundos): a introdução, a frase repetida e
   a despedida. Somam 10 s, os mesmos 0:34 → 0:24 da "edição final" das mensagens. */
const REMOVED: Array<[number, number]> = [
  [0, 3],
  [19, 23],
  [31, 34],
];

/** Barras de áudio determinísticas: a mesma página desenha sempre a mesma onda. */
function waveform(count: number): number[] {
  return Array.from({ length: count }, (_, i) => 0.28 + 0.62 * Math.abs(Math.sin(i * 1.37) * Math.cos(i * 0.41)));
}

/** As quatro telas do passeio pelo produto: enviar, analisar, revisar e exportar. */
export async function buildTourSteps(sample: Analysis): Promise<TourStep[]> {
  const t = await getTranslations("Landing");
  const steps = t.raw("tour.steps") as Array<{ label: string; title: string; text: string }>;
  const analyze = t.raw("tour.analyze") as string[];
  const lines = t.raw("caderno.lines") as Line[];
  const notes = t.raw("copilot.notes") as string[];
  const plan = t.raw("hero.planItems") as Array<{ time: string; kind: string; text: string }>;
  const duration = formatTimestamp(sample.durationSec);
  const edited = sample.durationSec - REMOVED.reduce((sum, [from, to]) => sum + (to - from), 0);
  const bars = waveform(56);
  const dropBar = Math.round((sample.dropAtSec / sample.durationSec) * bars.length);

  const upload = (
    <div className="flex h-full flex-col gap-4 p-5 sm:p-8">
      <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-[rgba(var(--ink-rgb),0.18)] bg-surface px-6 text-center">
        <div>
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-paper-raised text-ink">
            <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="mt-4 text-[15px] font-semibold">{t("tour.upload.drop")}</p>
          <p className="mt-1 font-mono text-[12px] text-ink-muted">{t("tour.upload.hint")}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-line p-3">
        <div className="h-14 w-8 shrink-0 overflow-hidden rounded-[6px]">
          <ReelFrame compact />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[14px] font-medium">{t("app.file")}</p>
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-confirmed">
              <Check size={13} strokeWidth={2.75} aria-hidden="true" />
              {t("tour.upload.uploaded")}
            </span>
          </div>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full w-full rounded-full bg-accent" />
          </span>
          <p className="mt-1.5 font-mono text-[11.5px] text-ink-muted">
            {t("app.duration")} {duration} · 9:16
          </p>
        </div>
      </div>
    </div>
  );

  const analysis = (
    <div className="grid h-full content-start gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:content-stretch sm:gap-8 sm:p-8">
      <ol className="flex flex-col">
        {analyze.map((item, index) => {
          const done = index < analyze.length - 1;
          return (
            <li key={item} className="flex items-center gap-3 border-b border-line py-3.5 text-[14.5px] last:border-b-0">
              {done ? (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-2 border-accent border-r-line border-t-line" />
              )}
              <span className={done ? "text-ink" : "font-medium text-ink"}>{item}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col justify-center rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div aria-hidden="true" className="flex h-24 items-center gap-[3px]">
          {bars.map((height, index) => (
            <span
              key={index}
              className={cn("flex-1 rounded-full", index >= dropBar && index <= dropBar + 3 ? "bg-accent" : "bg-[rgba(var(--ink-rgb),0.22)]")}
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between font-mono text-[11.5px] text-ink-muted">
          <span>0:00</span>
          <span className="text-accent">{t("app.dropAt", { time: formatTimestamp(sample.dropAtSec) })}</span>
          <span>{duration}</span>
        </div>
      </div>
    </div>
  );

  const review = (
    <div className="flex h-full flex-col gap-3 p-5 sm:p-8">
      <div className="rounded-xl border border-[rgba(var(--accent-rgb),0.35)] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Badge tone="accent" className="!py-0 !text-[11px]">
              {t("hero.art.cut")}
            </Badge>
            <span className="font-mono text-[11.5px] text-ink-muted">{plan[0].time}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
            <Check size={13} strokeWidth={2.75} aria-hidden="true" />
            {t("app.accepted")}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-snug">
          <span className="strike-cut">{lines[0].text}</span>
        </p>
        <p className="mt-2 font-mono text-[11.5px] text-ink-muted">{t("hero.art.cutDetail")}</p>
      </div>
      <div className="rounded-xl border border-line p-4">
        <div className="flex items-center gap-2">
          <Badge className="!py-0 !text-[11px]">{plan[1].kind}</Badge>
          <span className="font-mono text-[11.5px] text-ink-muted">{plan[1].time}</span>
        </div>
        <p className="mt-3 text-[15px] leading-snug">{plan[1].text}</p>
        <p className="mt-3 rounded-lg bg-surface px-3 py-2.5 text-[14px] leading-snug">
          <span className="text-ink-muted">{t("copilot.tryInstead")} </span>
          {notes[1]}
        </p>
        <div className="mt-4 flex gap-2">
          <MockButton>
            <Check size={14} strokeWidth={2.5} />
            {t("hero.art.accept")}
          </MockButton>
          <MockButton variant="secondary" className="w-9 px-0">
            <X size={14} strokeWidth={2.25} />
          </MockButton>
        </div>
      </div>
    </div>
  );

  const exported = (
    <div className="flex h-full flex-col gap-6 p-5 sm:p-8">
      {[
        { label: t("tour.export.before"), length: sample.durationSec, cuts: REMOVED },
        { label: t("tour.export.after"), length: edited, cuts: [] as Array<[number, number]> },
      ].map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between font-mono text-[12px]">
            <span className="text-ink-muted">{row.label}</span>
            <span className="text-ink">{formatTimestamp(row.length)}</span>
          </div>
          <div className="relative mt-2 h-10 overflow-hidden rounded-lg bg-[rgba(var(--ink-rgb),0.1)]" style={{ width: `${(row.length / sample.durationSec) * 100}%` }}>
            {row.cuts.map(([from, to]) => (
              <span key={from} className="absolute inset-y-0 bg-accent" style={{ left: `${(from / row.length) * 100}%`, width: `${((to - from) / row.length) * 100}%` }} />
            ))}
          </div>
        </div>
      ))}
      <p className="flex items-center gap-2 text-[13px] text-ink-muted">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-accent" />
        {t("tour.export.removed")}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3 pl-4">
        <p className="min-w-0 truncate font-mono text-[12px] text-ink-muted">{t("copilot.finalEdit")}</p>
        <MockButton>
          <Download size={14} strokeWidth={2.25} />
          {t("tour.export.download")}
        </MockButton>
      </div>
    </div>
  );

  const panels = [upload, analysis, review, exported];
  return steps.map((step, index) => ({ ...step, panel: panels[index] }));
}
