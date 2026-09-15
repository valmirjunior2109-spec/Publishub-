"use client";

import { useTranslations } from "next-intl";
import { Scissors } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { formatTimestamp } from "@/lib/format";
import type { Copilot, Pace } from "@/lib/types";

const PACE_TONE: Record<Pace, BadgeTone> = { lento: "pending", bom: "confirmed", acelerado: "pending" };

interface CopilotPanelProps {
  copilot: Copilot | null;
  onSeek: (seconds: number) => void;
}

function TimeButton({ from, to, onSeek }: { from: number; to?: number | null; onSeek: (s: number) => void }) {
  return (
    <button type="button" onClick={() => onSeek(from)} className="inline-flex shrink-0 items-center gap-1.5 font-display text-[16px] font-semibold tabular-nums tracking-tight text-ink hover:text-accent">
      <span aria-hidden="true" className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-accent" />
      {formatTimestamp(from)}
      {to != null && to > from && <span className="font-normal text-ink-muted">→ {formatTimestamp(to)}</span>}
    </button>
  );
}

/**
 * O copiloto de edição: ritmo, gancho, trechos parados e cortes, o vídeo inteiro e não só a queda.
 * Os textos da IA vêm no idioma falado no vídeo. Quando a IA não respondeu, os cortes vêm medidos
 * do arquivo (pausas e planos) e o texto sai das traduções, no idioma do site.
 */
export function CopilotPanel({ copilot, onSeek }: CopilotPanelProps) {
  const t = useTranslations("Analysis.copilot");
  const measured = copilot?.source === "measured";
  const hook = copilot?.hook_score ?? null;

  return (
    <section className="mt-20">
      <div className="mb-8 flex items-center gap-7">
        <div className="h-px flex-1 bg-line" />
        <h2 className="flex items-center gap-2.5 whitespace-nowrap font-display text-[22px] font-medium tracking-[-0.01em]">
          <Scissors size={18} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          {t("title")}
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>

      {!copilot ? (
        <p className="rounded-sm border border-line bg-paper-raised p-4 text-sm text-ink-muted">{t("unavailable")}</p>
      ) : (
        <>
          {measured && <p className="mb-6 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-muted">{t("measured.note")}</p>}
          <div className="grid items-start gap-6 lg:grid-cols-[5fr_7fr] lg:gap-10">
            {/* ---- esquerda: ritmo, gancho, por onde começar ---- */}
            <div className="flex flex-col gap-4">
              <Reveal className="rounded-md border border-line bg-paper-raised p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="t-label tracking-[0.08em]">{t("pace.label")}</p>
                  <Badge tone={PACE_TONE[copilot.pace]} dot>
                    {t(`pace.${copilot.pace}`)}
                  </Badge>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">{copilot.pace_note ?? t("measured.pace", copilot.pace_params ?? { wps: 0, pause_pct: 0 })}</p>
              </Reveal>

              {hook !== null && (
                <Reveal delay={100} className="rounded-md border border-line bg-paper-raised p-6">
                  <p className="t-label tracking-[0.08em]">{t("hook.label")}</p>
                  <p className="mt-2 font-display text-[56px] font-bold leading-none tabular-nums tracking-tight">
                    {hook}
                    <span className="text-[22px] font-medium text-ink-muted">/10</span>
                  </p>
                  {/* dez traços: os preenchidos são a nota */}
                  <div className="mt-3 flex gap-1" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-sm transition-colors duration-500 ${i < hook ? "bg-accent" : "bg-line"}`} style={{ transitionDelay: `${i * 40}ms` }} />
                    ))}
                  </div>
                  {copilot.hook_note && <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{copilot.hook_note}</p>}
                </Reveal>
              )}

              <Reveal delay={200} className="rounded-md border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-6">
                <p className="t-label tracking-[0.08em] text-accent">{t("start")}</p>
                <p className="mt-3 font-display text-[17px] leading-[1.5]">{copilot.summary ?? t("measured.summary")}</p>
              </Reveal>
            </div>

            {/* ---- direita: cortes e trechos parados, na ordem do vídeo ---- */}
            <div className="flex flex-col gap-8">
              <Reveal delay={150}>
                <p className="t-label mb-2 tracking-[0.08em]">{t("cuts.label")}</p>
                {copilot.cuts.length === 0 ? (
                  <p className="border-t border-line py-4 text-sm text-ink-muted">{t("cuts.none")}</p>
                ) : (
                  <ol className="stagger">
                    {copilot.cuts.map((cut, index) => (
                      <li key={index} className="grid gap-2 border-t border-line py-4 last:border-b sm:grid-cols-[120px_1fr] sm:gap-5">
                        <TimeButton from={cut.at_seconds} to={cut.end_seconds} onSeek={onSeek} />
                        <div>
                          <Badge tone="accent">{t(`actions.${cut.action}`)}</Badge>
                          <p className="mt-2 text-[14px] leading-relaxed">{cut.why ?? t(`measured.why.${cut.why_code ?? "long_pause"}`, cut.params ?? {})}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Reveal>

              <Reveal delay={250}>
                <p className="t-label mb-2 tracking-[0.08em]">{t("slow.label")}</p>
                {copilot.slow_stretches.length === 0 ? (
                  <p className="border-t border-line py-4 text-sm text-ink-muted">{t("slow.none")}</p>
                ) : (
                  <ol className="stagger">
                    {copilot.slow_stretches.map((stretch, index) => (
                      <li key={index} className="grid gap-2 border-t border-line py-4 last:border-b sm:grid-cols-[120px_1fr] sm:gap-5">
                        <TimeButton from={stretch.start_seconds} to={stretch.end_seconds} onSeek={onSeek} />
                        <p className="text-[14px] leading-relaxed text-ink-muted">
                          {stretch.reason ?? t(`measured.reason.${stretch.reason_code === "static_shot" ? "static_shot" : "long_pause"}`, stretch.params ?? {})}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </Reveal>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
