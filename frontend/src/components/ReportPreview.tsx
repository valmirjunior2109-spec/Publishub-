"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, FileSearch, Wrench } from "lucide-react";
import type { IssueGroup } from "@/lib/report";
import type { Impact } from "@/lib/scanner/rules";
import { RISK_LABEL, type RiskBand } from "@/lib/scanner/score";
import { cn } from "@/lib/cn";

const IMPACT_STYLE: Record<Impact, string> = {
  critical: "bg-critical-soft text-critical",
  serious: "bg-serious-soft text-serious",
  moderate: "bg-moderate-soft text-moderate",
  minor: "bg-minor-soft text-minor",
};
const IMPACT_LABEL: Record<Impact, string> = { critical: "Critical", serious: "Serious", moderate: "Moderate", minor: "Minor" };
const PAGES = ["Home", "Collection", "Product", "Cart"];

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A prévia do relatório no hero, com os dados da loja fictícia do relatório de exemplo.
 * Anima uma vez ao aparecer: o anel enche, o número conta e as linhas entram em sequência.
 * Para leitores de tela, um resumo em texto; a parte visual fica aria-hidden.
 */
export function ReportPreview({ store, score, band, groups, total }: { store: string; score: number; band: RiskBand; groups: IssueGroup[]; total: number }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = () => {
      node.dataset.visible = "true";
      setShown(true);
      if (reduce) {
        setCount(score);
        return;
      }
      const began = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - began) / 1500);
        setCount(Math.round(score * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [score]);

  const offset = shown ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE;

  return (
    <figure ref={ref} className="relative mx-auto w-full max-w-4xl">
      <figcaption className="sr-only">
        Example of a Publishub report for a fictional store, {store}: estimated risk indicator {score} out of 100 ({RISK_LABEL[band]}), {total} issues found
        across 4 pages. Top issues: {groups.map((group) => `${group.title} (${group.occurrences})`).join(", ")}.
      </figcaption>

      <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-card text-left shadow-[0_40px_80px_-40px_hsl(var(--shadow-color)/0.5)]">
        {/* a barra da janela */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff8a3d]" />
            <span className="h-3 w-3 rounded-full bg-[#ffc94d]" />
            <span className="h-3 w-3 rounded-full bg-[#2fd3a0]" />
          </div>
          <div className="mx-auto flex min-w-0 items-center gap-2 rounded-md border border-line bg-card px-3 py-1 text-xs text-muted">
            <FileSearch className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">getpublishub.com/scan · {store}</span>
          </div>
          <span className="hidden rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent sm:inline">Example report</span>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[220px_1fr]">
          {/* o anel do risk score */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-5">
            <div className="relative h-[132px] w-[132px]">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <defs>
                  <linearGradient id="preview-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ff8a3d" />
                    <stop offset="100%" stopColor="#e5484d" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="10" />
                <circle
                  className="score-ring"
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke="url(#preview-ring)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums tracking-[-0.04em] text-ink">{count}</span>
                <span className="text-xs font-medium text-muted">/ 100</span>
              </div>
            </div>
            <span className="mt-3 rounded-full bg-critical-soft px-3 py-1 text-xs font-semibold text-critical">{RISK_LABEL[band]} estimated risk</span>
          </div>

          {/* as linhas de problemas */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                {total} issues on {store}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PAGES.map((page, index) => (
                  <span
                    key={page}
                    className="preview-row inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"
                    style={{ "--row-delay": `${200 + index * 120}ms` } as CSSProperties}
                  >
                    <Check className="h-3 w-3" />
                    {page}
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {groups.map((group, index) => (
                <li
                  key={group.ruleId}
                  className="preview-row flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
                  style={{ "--row-delay": `${500 + index * 140}ms` } as CSSProperties}
                >
                  <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", IMPACT_STYLE[group.impact])}>
                    {IMPACT_LABEL[group.impact]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{group.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">×{group.occurrences}</span>
                  <span className="hidden shrink-0 items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent sm:inline-flex">
                    <Wrench className="h-3 w-3" />
                    Fix
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </figure>
  );
}
