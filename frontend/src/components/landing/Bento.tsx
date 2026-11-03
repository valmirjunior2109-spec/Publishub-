import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { InViewPlay } from "@/components/landing/InViewPlay";
import { NotionTile } from "@/components/landing/NotionPage";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/cn";
import type { Analysis } from "@/lib/fixtures";

function Card({ title, text, textFirst, delay, className, visual, children }: { title: string; text: string; textFirst?: boolean; delay: number; className?: string; visual?: string; children: ReactNode }) {
  return (
    <Reveal as="li" delay={delay} className={cn("bento-card flex flex-col", className)}>
      <div className={cn("px-6", textFirst ? "order-1 pt-6" : "order-2 pb-6 pt-1")}>
        <h3 className="text-[17px] font-medium leading-snug tracking-[-0.02em] text-balance">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{text}</p>
      </div>
      <InViewPlay className={cn("relative min-h-[220px] flex-1 overflow-hidden", textFirst ? "order-2" : "order-1", visual)}>{children}</InViewPlay>
    </Reveal>
  );
}

/* ---------- a curva: o ponto corre pela retenção e a queda aparece no segundo certo ---------- */

const CURVE = "M12 44 C 80 46 128 48 162 58 C 188 66 190 146 220 156 C 262 168 310 172 348 176";

function CurveVisual({ drop }: { drop: string }) {
  return (
    <>
      <div aria-hidden="true" className="fade-grid absolute inset-0" />
      <svg aria-hidden="true" viewBox="0 0 360 220" data-hold="5" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="bento-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${CURVE} L348 220 L12 220 Z`} fill="url(#bento-area)" />
        <path d={CURVE} pathLength={1} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1">
          <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.5;1" dur="8s" repeatCount="indefinite" />
        </path>
        <g>
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.24;0.3;0.94;1" dur="8s" repeatCount="indefinite" />
          <line x1="190" x2="190" y1="62" y2="212" stroke="var(--caramel)" strokeDasharray="3 4" />
          <rect x="136" y="18" width="108" height="28" rx="14" fill="var(--paper-raised)" stroke="var(--line)" />
          <text x="190" y="37" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--caramel-ink)" className="font-mono">
            {drop}
          </text>
        </g>
        <circle r="5.5" fill="var(--paper-raised)" stroke="var(--accent)" strokeWidth="2.5">
          <animateMotion path={CURVE} keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear" dur="8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </>
  );
}

/* ---------- a transcrição: a linha fraca é riscada, a nota aparece e a forte fica ---------- */

interface Line {
  time: string;
  text: string;
  note: string;
}

function TranscriptVisual({ said, lines }: { said: string; lines: Line[] }) {
  const [cut, drop, keep] = lines;
  return (
    <div className="soft-panel mx-4 mt-4 flex flex-1 rounded-t-2xl px-3 pt-3 sm:mx-6">
      <div aria-hidden="true" className="flex flex-1 flex-col gap-3 rounded-t-xl border border-b-0 border-line bg-paper-raised p-4">
        <p className="t-label">{said}</p>
        <div className="line-scan">
          <p className="text-[14px] leading-snug">
            <span className="mr-2 font-mono text-[11.5px] text-ink-muted">{cut.time}</span>
            <span className="line-strike">{cut.text}</span>
          </p>
          <p className="line-note mt-1 text-[12.5px] font-medium text-caramel-ink first-letter:uppercase">{cut.note}</p>
        </div>
        <div className="line-scan" style={{ animationDelay: "0.5s" }}>
          <p className="text-[14px] leading-snug">
            <span className="mr-2 font-mono text-[11.5px] text-ink-muted">{drop.time}</span>
            {drop.text}
          </p>
          <p className="line-note mt-1 text-[12.5px] font-medium text-caramel-ink first-letter:uppercase" style={{ animationDelay: "0.5s" }}>
            {drop.note}
          </p>
        </div>
        <div className="line-scan rounded-lg bg-[color-mix(in_srgb,var(--confirmed)_10%,transparent)] px-2.5 py-2" style={{ animationDelay: "1s" }}>
          <p className="text-[14px] leading-snug">
            <span className="mr-2 font-mono text-[11.5px] text-ink-muted">{keep.time}</span>
            {keep.text}
          </p>
          <p className="mt-1 text-[12.5px] font-medium text-confirmed first-letter:uppercase">{keep.note}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- o Notion: a marca e o Notion ligados, com a análise indo de um para o outro ---------- */

const RING_A = "M30 110 a150 58 0 1 0 300 0 a150 58 0 1 0 -300 0";
const RING_B = "M68 110 a112 40 0 1 1 224 0 a112 40 0 1 1 -224 0";
const LINK = "M146 110 L214 110";

function NotionVisual({ brand }: { brand: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-[220px] w-[360px] shrink-0">
        <svg aria-hidden="true" viewBox="0 0 360 220" data-hold="2" className="absolute inset-0 h-full w-full">
          <g transform="rotate(-9 180 110)">
            <path d={RING_A} fill="none" stroke="var(--line)" />
            <path d={RING_B} fill="none" stroke="var(--line)" strokeDasharray="3 5" />
            <circle r="4" fill="var(--accent)">
              <animateMotion path={RING_A} dur="11s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="var(--caramel)">
              <animateMotion path={RING_B} dur="8s" repeatCount="indefinite" />
            </circle>
          </g>
          <path d={LINK} stroke="var(--accent)" strokeOpacity="0.45" strokeDasharray="2 5" strokeLinecap="round" strokeWidth="2" />
          <rect x="-7" y="-9" width="14" height="18" rx="3" fill="var(--paper-raised)" stroke="var(--accent)" strokeWidth="1.5">
            <animateMotion path={LINK} keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear" dur="3.2s" repeatCount="indefinite" />
          </rect>
        </svg>
        <span className="orbit-breathe absolute left-[84px] top-[78px] flex h-16 w-16 items-center justify-center rounded-[18px] border border-line bg-paper-raised shadow-float">
          <Logo variant="icon" size="md" label={brand} />
        </span>
        <span className="orbit-breathe absolute left-[212px] top-[78px] [animation-delay:-3s]">
          <NotionTile className="h-16 w-16 rounded-[18px] text-[32px] shadow-float" />
        </span>
      </div>
    </div>
  );
}

/* ---------- os cortes: aceitar tira o trecho, e a linha do tempo fecha ---------- */

const WAVEFORM = "repeating-linear-gradient(90deg, rgba(var(--accent-rgb), 0.28) 0 2px, transparent 2px 5px)";

function CutsVisual({ cut, detail, accept, accepted, finalEdit }: { cut: string; detail: string; accept: string; accepted: string; finalEdit: string }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-center gap-4 px-6">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] font-medium">
        {cut}
        <span className="font-mono text-[11.5px] font-normal text-ink-muted">{detail}</span>
      </p>
      <div className="relative h-14 w-full overflow-hidden rounded-xl bg-surface">
        <div className="absolute inset-y-1.5 left-1 w-[38%] rounded-lg bg-accent-soft" style={{ backgroundImage: WAVEFORM }} />
        <div className="cut-mid absolute inset-y-1.5 left-[38%] w-[24%] rounded-lg border border-dashed border-caramel bg-[color-mix(in_srgb,var(--caramel)_16%,transparent)]" />
        <div className="cut-after absolute inset-y-1.5 left-[62%] w-[38%] rounded-lg bg-accent-soft" style={{ backgroundImage: WAVEFORM }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="cut-press inline-flex h-8 items-center rounded-full bg-accent px-3.5 text-[12.5px] font-medium text-on-accent">{accept}</span>
          <span className="cut-ok inline-flex items-center gap-1 text-[12.5px] font-semibold text-confirmed">
            <Check size={14} strokeWidth={2.75} />
            {accepted}
          </span>
        </span>
        <span className="font-mono text-[11.5px] text-ink-muted">{finalEdit}</span>
      </div>
    </div>
  );
}

/* ---------- os editores: passam num arco, por cima da publishub, que recebe o que eles exportam ---------- */

const ARC = "M-150 176 C -30 176 60 82 185 82 C 310 82 400 176 520 176";
const BELT_SECONDS = 22;

function BeltVisual({ names, brand }: { names: string[]; brand: string }) {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 370 240" preserveAspectRatio="xMidYMid slice" data-hold="7" className="absolute inset-0 h-full w-full">
        <path d={ARC} fill="none" stroke="var(--line)" strokeDasharray="3 6" />
        {names.map((name, index) => {
          const width = name.length * 7.3 + 32;
          return (
            <g key={name}>
              <animateMotion path={ARC} dur={`${BELT_SECONDS}s`} begin={`${(-index * BELT_SECONDS) / names.length}s`} calcMode="linear" repeatCount="indefinite" />
              <rect x={-width / 2} y="-19" width={width} height="38" rx="19" fill="var(--paper-raised)" stroke="var(--line)" />
              <text textAnchor="middle" y="5" fontSize="14" fontWeight="500" letterSpacing="-0.2" fill="var(--ink)">
                {name}
              </text>
            </g>
          );
        })}
      </svg>
      <span className="orbit-breathe absolute bottom-3 left-1/2 -ml-7 flex h-14 w-14 items-center justify-center rounded-[16px] border border-line bg-paper-raised shadow-float">
        <Logo variant="icon" size="sm" label={brand} />
      </span>
    </>
  );
}

/* ---------- a previsão: as duas barras sobem até os números ---------- */

function Bar({ label, value, delay, strong }: { label: string; value: number; delay: string; strong?: boolean }) {
  return (
    <div className="flex h-full flex-1 flex-col justify-end text-center">
      <p className="bar-text text-[26px] font-medium tracking-[-0.03em] tabular-nums" style={{ "--bar-delay": delay } as CSSProperties}>
        {value}%
      </p>
      <div className={cn("bar-grow mt-1.5 rounded-t-xl", strong ? "bg-accent" : "bg-accent-soft")} style={{ height: `${value * 1.1}px`, "--bar-delay": delay } as CSSProperties} />
      <p className="border-t border-line pt-2 text-[12.5px] text-ink-muted">{label}</p>
    </div>
  );
}

function PredictVisual({ metric, example, predicted, actual, predictedValue, actualValue }: { metric: string; example: string; predicted: string; actual: string; predictedValue: number; actualValue: number }) {
  return (
    <div className="absolute inset-0 flex flex-col px-6 pb-2 pt-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-mono text-[11.5px] leading-snug text-ink-muted">{metric}</p>
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-muted">{example}</span>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[280px] flex-1 items-end gap-5 pt-2">
        <Bar label={predicted} value={predictedValue} delay="0s" />
        <Bar label={actual} value={actualValue} delay="0.35s" strong />
      </div>
    </div>
  );
}

/**
 * O que o produto faz, em seis cartões animados: a queda, a nota em cada linha, o
 * Notion, os cortes aprovados, os editores e a previsão. Tudo é função real, e os
 * números são os da análise de exemplo, com o rótulo de exemplo onde aparecem soltos.
 */
export async function Bento({ names, loopSample, loopTime }: { names: string[]; loopSample: Analysis; loopTime: string }) {
  const t = await getTranslations("Landing");
  const c = await getTranslations("Landing.caderno");
  const n = await getTranslations("Analysis.notion");
  const common = await getTranslations("Common");
  const values = t.raw("value.items") as { title: string; text: string }[];
  const lines = c.raw("lines") as Line[];
  const loopDiff = Math.round((loopSample.prediction.actual ?? 0) - loopSample.prediction.predicted);

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <ul className="grid gap-4 lg:grid-cols-[1fr_1.25fr_1fr] lg:gap-5">
        <Card title={values[0].title} text={values[0].text} delay={0}>
          <CurveVisual drop={t("hero.art.drop")} />
        </Card>
        <Card title={values[1].title} text={values[1].text} textFirst delay={60} visual="flex min-h-[300px]">
          <TranscriptVisual said={t("app.said")} lines={lines} />
        </Card>
        <Card title={n("title")} text={n("lead")} delay={120}>
          <NotionVisual brand={common("brand")} />
        </Card>
      </ul>
      <ul className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <Card title={values[3].title} text={values[3].text} textFirst delay={0}>
          <CutsVisual cut={t("hero.art.cut")} detail={t("hero.art.cutDetail")} accept={t("hero.art.accept")} accepted={t("app.accepted")} finalEdit={t("copilot.finalEdit")} />
        </Card>
        <Card title={t("worksAlso")} text={t("workflow.in.text")} delay={60}>
          <BeltVisual names={names} brand={common("brand")} />
        </Card>
        <Card title={t("loop.title")} text={t("loop.sampleVerdict", { diff: loopDiff })} delay={120} visual="min-h-[260px]">
          <PredictVisual metric={t("loop.metric", { time: loopTime })} example={t("loop.sampleTag")} predicted={t("loop.predicted")} actual={t("loop.actual")} predictedValue={loopSample.prediction.predicted} actualValue={loopSample.prediction.actual ?? 0} />
        </Card>
      </ul>
    </div>
  );
}
