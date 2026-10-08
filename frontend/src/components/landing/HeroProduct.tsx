import { getTranslations } from "next-intl/server";
import { Check, Download } from "lucide-react";
import { AppWindow, MockButton } from "@/components/landing/Section";
import { ReelFrame } from "@/components/landing/ReelFrame";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Analysis } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";

interface PlanItem {
  time: string;
  kind: string;
  text: string;
}

/**
 * A tela de análise, como ela aparece no produto: o vídeo, a curva com o segundo
 * da queda, a frase dita naquele segundo e o plano de edição com os cortes
 * aceitos. É a peça principal do topo da landing. Dados: a análise de exemplo
 * (fixture); textos: as mensagens, nos três idiomas.
 */
export async function HeroProduct({ sample }: { sample: Analysis }) {
  const t = await getTranslations("Landing");
  const plan = t.raw("hero.planItems") as PlanItem[];
  const dropTime = formatTimestamp(sample.dropAtSec);
  const lost = Math.round(sample.retention[sample.dropAtSec][1] - sample.retention[sample.dropAtSec + 2][1]);
  const duration = formatTimestamp(sample.durationSec);

  return (
    <AppWindow
      title={t("app.file")}
      label={t("mock.window")}
      meta={
        <Badge tone="confirmed" dot className="hidden sm:inline-flex">
          {t("mock.ready")}
        </Badge>
      }
    >
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)_340px]">
        {/* o vídeo: a partir do tablet, uma coluna; no celular, uma miniatura ao lado dos números */}
        <div className="hidden border-r border-line p-4 md:block">
          <div className="aspect-[9/16] overflow-hidden rounded-xl">
            <ReelFrame phrase={t("hero.samplePhrase")} exampleLabel={t("mock.example")} />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[11.5px] text-ink-muted">
            <span>
              <span className="text-accent">{dropTime}</span> / {duration}
            </span>
            <span>9:16</span>
          </div>
        </div>

        {/* a queda: o segundo, o tamanho dela, a curva e a frase */}
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="h-[92px] w-[52px] shrink-0 overflow-hidden rounded-md md:hidden">
              <ReelFrame compact />
            </div>
            <div className="min-w-0">
              <p className="t-label">{t("app.retention")}</p>
              <p className="mt-2 font-display text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[28px]">{t("app.dropAt", { time: dropTime })}</p>
              <p className="mt-1 font-mono text-[13px] font-medium text-accent">{t("app.lost", { lost })}</p>
            </div>
          </div>
          <Reveal variant="curve" delay={250} className="mt-5">
            <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} axisSize={20} />
          </Reveal>
          <div className="mt-5 border-l-2 border-accent pl-4">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-muted">
              {t("app.said")} · {formatTimestamp(sample.dropAtSec - 1)}
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed">“{t("hero.samplePhrase")}”</p>
          </div>
        </div>

        {/* o plano: na ordem do que muda mais a retenção, com os cortes que a pessoa aceitou */}
        <div className="flex flex-col border-t border-line bg-surface md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <p className="text-[13.5px] font-semibold">{t("app.plan")}</p>
            <p className="font-mono text-[11.5px] text-ink-muted">{t("copilot.decideSummary")}</p>
          </div>
          <ol className="flex flex-col gap-2 p-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:p-4 lg:flex lg:gap-2 lg:p-3">
            {plan.map((item, index) => {
              const accepted = index < 2;
              return (
                <li key={item.time + item.kind} className={cn("rounded-xl border bg-paper-raised p-3.5", accepted ? "border-[rgba(var(--accent-rgb),0.35)]" : "border-line")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11.5px] text-ink-muted">{item.time}</span>
                      <Badge tone={index === 0 ? "accent" : "neutral"} className="!py-0 !text-[11px]">
                        {item.kind}
                      </Badge>
                    </span>
                    {accepted ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
                        <Check size={13} strokeWidth={2.75} aria-hidden="true" />
                        {t("app.accepted")}
                      </span>
                    ) : (
                      <MockButton variant="secondary" className="h-7 px-2.5 text-[12px]">
                        {t("hero.art.accept")}
                      </MockButton>
                    )}
                  </div>
                  <p className="mt-2 text-[14px] leading-snug">{item.text}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="font-mono text-[12px] text-ink-muted">{t("copilot.finalEdit")}</p>
            <MockButton>
              <Download size={14} strokeWidth={2.25} />
              {t("app.export")}
            </MockButton>
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
