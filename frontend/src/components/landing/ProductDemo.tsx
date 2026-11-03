"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Download, FileVideo, Send, UploadCloud } from "lucide-react";
import { HeroReel } from "@/components/landing/HeroReel";
import { NotionPage, NotionTile, type NotionPageText } from "@/components/landing/NotionPage";
import { AppWindow, MockButton } from "@/components/landing/Section";
import { RetentionCurve } from "@/components/RetentionCurve";
import { cn } from "@/lib/cn";
import type { CurvePoint } from "@/lib/types";

export interface ProductDemoText {
  window: string;
  file: string;
  tabs: string[];
  drop: string;
  hint: string;
  uploaded: string;
  analyze: string[];
  retention: string;
  dropAt: string;
  lost: string;
  said: string;
  saidTime: string;
  phrase: string;
  plan: string;
  planCount: string;
  items: { time: string; kind: string; text: string }[];
  accept: string;
  accepted: string;
  finalEdit: string;
  export: string;
  notionTitle: string;
  notionConnected: string;
  notionSend: string;
  notionPage: NotionPageText;
  reel: { example: string; label: string; soundOn: string; soundOff: string };
}

interface ProductDemoProps {
  text: ProductDemoText;
  points: CurvePoint[];
  durationSec: number;
  dropAtSec: number;
}

/* quanto tempo cada etapa fica na tela: enviar, analisar, revisar e mandar para o Notion */
const DURATION = [2600, 3400, 6000, 6000];
const REVIEW = 2;

/**
 * O produto funcionando, no topo da página: o vídeo sobe, é analisado, os cortes são
 * aceitos e a análise vai para o Notion. Começa na revisão, que é a tela que explica
 * o produto sozinha (e é o que aparece sem JavaScript ou com "reduzir movimento").
 * Roda só enquanto está na tela; clicar numa etapa para o ciclo e deixa a pessoa olhar.
 */
export function ProductDemo({ text, points, durationSec, dropAtSec }: ProductDemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(REVIEW);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!auto || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    function schedule() {
      clearTimeout(timer);
      if (visible && !document.hidden) timer = setTimeout(() => setStage((current) => (current + 1) % DURATION.length), DURATION[stage]);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [stage, auto]);

  const on = (index: number) => cn("demo-stage", stage === index && "is-on");

  return (
    <div ref={ref}>
      <AppWindow title={text.file} label={text.window}>
        <div className="grid md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)]">
          <div className="hidden border-r border-line p-4 md:block">
            <HeroReel exampleLabel={text.reel.example} label={text.reel.label} soundOn={text.reel.soundOn} soundOff={text.reel.soundOff} />
          </div>

          <div className="flex min-w-0 flex-col">
            {/* as etapas: mostram onde o ciclo está e deixam ir direto a uma delas */}
            <div className="flex gap-1 overflow-x-auto border-b border-line p-2 [scrollbar-width:none]">
              {text.tabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={stage === index}
                  onClick={() => {
                    setStage(index);
                    setAuto(false);
                  }}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors duration-200",
                    stage === index ? "bg-surface text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <span className="font-mono text-[11px] opacity-70">{index + 1}</span>
                  {tab}
                </button>
              ))}
            </div>

            <div className="demo-stack flex-1">
              {/* 1 · enviar */}
              <div aria-hidden={stage !== 0} className={cn(on(0), "flex items-center justify-center p-5 sm:p-8")}>
                <div className="w-full max-w-[460px] rounded-2xl border border-dashed border-[rgba(var(--accent-rgb),0.4)] bg-accent-soft/40 p-6 text-center sm:p-8">
                  <UploadCloud size={26} strokeWidth={1.75} aria-hidden="true" className="mx-auto text-accent" />
                  <p className="mt-3 text-[16px] font-medium tracking-[-0.015em]">{text.drop}</p>
                  <p className="mt-1 font-mono text-[12px] text-ink-muted">{text.hint}</p>
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-paper-raised p-3 text-left">
                    <FileVideo size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{text.file}</p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                        <div className="demo-progress h-full rounded-full bg-accent" />
                      </div>
                    </div>
                    <span className="demo-tick shrink-0" style={{ "--tick": "1.5s" } as CSSProperties}>
                      <Check data-done size={16} strokeWidth={2.5} aria-label={text.uploaded} className="text-confirmed" />
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 · analisar */}
              <div aria-hidden={stage !== 1} className={cn(on(1), "flex items-center justify-center p-5 sm:p-8")}>
                <ul className="flex w-full max-w-[420px] flex-col gap-2.5">
                  {text.analyze.map((step, index) => (
                    <li key={step} className="demo-tick flex items-center gap-3 rounded-xl border border-line bg-paper-raised px-4 py-3 text-[14px]" style={{ "--tick": `${0.15 + index * 0.65}s` } as CSSProperties}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                        <Check data-done size={12} strokeWidth={3} aria-hidden="true" className="text-accent" />
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3 · revisar: a queda e o plano, com os cortes sendo aceitos */}
              <div aria-hidden={stage !== REVIEW} className={cn(on(REVIEW), "grid lg:grid-cols-[minmax(0,1fr)_316px]")}>
                <div className="min-w-0 p-5">
                  <p className="t-label">{text.retention}</p>
                  <p className="mt-2 font-serif text-[26px] leading-tight tracking-[-0.015em] sm:text-[30px]">{text.dropAt}</p>
                  <p className="mt-1 font-mono text-[13px] font-medium text-caramel-ink">{text.lost}</p>
                  <div className={cn("curve-draw mt-4", stage === REVIEW && "is-visible")}>
                    <RetentionCurve points={points} durationSec={durationSec} dropAtSec={dropAtSec} axisSize={34} className="sm:hidden" />
                    <RetentionCurve points={points} durationSec={durationSec} dropAtSec={dropAtSec} axisSize={20} className="hidden sm:block" />
                  </div>
                  <div className="demo-rise mt-4 border-l-2 border-caramel pl-4" style={{ "--rise": "0.9s" } as CSSProperties}>
                    <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-muted">
                      {text.said} · {text.saidTime}
                    </p>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed">“{text.phrase}”</p>
                  </div>
                </div>
                <div className="flex flex-col border-t border-line bg-surface lg:border-l lg:border-t-0">
                  <div className="flex items-center justify-between gap-3 px-4 pt-4">
                    <p className="text-[13.5px] font-semibold">{text.plan}</p>
                    <p className="font-mono text-[11.5px] text-ink-muted">{text.planCount}</p>
                  </div>
                  <ol className="flex flex-col gap-2 p-3">
                    {text.items.map((item, index) => (
                      <li key={item.time + item.kind} className="demo-rise rounded-xl border border-line bg-paper-raised p-3" style={{ "--rise": `${0.5 + index * 0.25}s` } as CSSProperties}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="font-mono text-[11.5px] text-ink-muted">{item.time}</span>
                            <span className="truncate rounded-full bg-surface px-2 py-px text-[11px] font-medium text-ink-muted">{item.kind}</span>
                          </span>
                          {/* a pessoa decide: dois aceitos, e o terceiro continua esperando */}
                          <span className="demo-stack shrink-0 justify-items-end" style={{ "--rise": `${2.2 + index * 0.8}s` } as CSSProperties}>
                            <span className={cn(index < 2 && "demo-skip")}>
                              <MockButton variant="secondary" className="!h-6 !px-2.5 text-[11.5px]">
                                {text.accept}
                              </MockButton>
                            </span>
                            {index < 2 && (
                              <span className="demo-accepted inline-flex h-6 items-center gap-1 text-[12px] font-semibold text-confirmed">
                                <Check size={13} strokeWidth={2.75} aria-hidden="true" />
                                {text.accepted}
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[13.5px] leading-snug">{item.text}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
                    <p className="font-mono text-[11.5px] text-ink-muted">{text.finalEdit}</p>
                    <MockButton className="!h-8 text-[12px]">
                      <Download size={13} strokeWidth={2.25} />
                      {text.export}
                    </MockButton>
                  </div>
                </div>
              </div>

              {/* 4 · levar para o Notion */}
              <div aria-hidden={stage !== 3} className={cn(on(3), "grid items-center gap-4 bg-surface p-4 sm:p-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-8")}>
                <div className="rounded-2xl border border-line bg-paper-raised p-4">
                  <NotionTile className="h-9 w-9 rounded-[10px] text-[20px]" />
                  <p className="mt-3 text-[15px] font-medium leading-snug tracking-[-0.015em]">{text.notionTitle}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-confirmed">
                    <Check size={13} strokeWidth={2.75} aria-hidden="true" />
                    {text.notionConnected}
                  </p>
                  <MockButton className="mt-4 w-full">
                    <Send size={13} strokeWidth={2.25} />
                    {text.notionSend}
                  </MockButton>
                </div>
                <NotionPage text={text.notionPage} mode="step" on={stage === 3} />
              </div>
            </div>
          </div>
        </div>
      </AppWindow>
    </div>
  );
}
