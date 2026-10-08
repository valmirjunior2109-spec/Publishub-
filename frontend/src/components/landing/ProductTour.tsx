"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TourStep {
  label: string;
  title: string;
  text: string;
  /** A tela daquele passo, montada no servidor. */
  panel: ReactNode;
}

/**
 * O passeio pelo produto: quatro passos, uma tela por vez. No computador, a lista
 * dos passos à esquerda e a tela à direita; no celular, as abas em cima. As setas
 * do teclado trocam de passo (padrão de abas do WAI-ARIA). Nada troca sozinho:
 * quem lê decide o ritmo.
 */
export function ProductTour({ steps, label, windowTitle }: { steps: TourStep[]; label: string; windowTitle: string }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const current = steps[active];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -index, End: steps.length - 1 - index };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = (index + move + steps.length) % steps.length;
    setActive(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
      <div role="tablist" aria-label={label} aria-orientation="vertical" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0">
        {steps.map((step, index) => {
          const selected = index === active;
          return (
            <button
              key={step.label}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "group shrink-0 text-left transition-colors duration-150",
                // celular: abas em pílula
                "rounded-full border px-4 py-2 text-[14px] font-medium",
                selected ? "border-ink bg-ink text-paper" : "border-line text-ink-muted hover:text-ink",
                // computador: a lista com a linha à esquerda
                "lg:rounded-none lg:border-0 lg:border-l-2 lg:bg-transparent lg:py-5 lg:pl-6 lg:pr-0",
                selected ? "lg:border-accent lg:text-ink" : "lg:border-line",
              )}
            >
              <span className="flex items-center gap-3">
                <span className={cn("hidden font-mono text-[12px] lg:inline", selected ? "text-accent" : "text-ink-muted")}>{String(index + 1).padStart(2, "0")}</span>
                <span className="lg:text-[17px] lg:font-semibold lg:tracking-[-0.02em]">
                  <span className="lg:hidden">{step.label}</span>
                  <span className="hidden lg:inline">{step.title}</span>
                </span>
              </span>
              <span className={cn("mt-2 hidden max-w-[34ch] text-[14.5px] font-normal leading-relaxed text-ink-muted lg:block", !selected && "lg:hidden")}>{step.text}</span>
            </button>
          );
        })}
      </div>

      <div>
        {/* no celular o texto do passo fica sobre a tela */}
        <div className="mb-5 lg:hidden">
          <p className="text-[18px] font-semibold tracking-[-0.02em]">{current.title}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{current.text}</p>
        </div>
        <figure
          role="tabpanel"
          id={`${base}-panel`}
          aria-labelledby={`${base}-tab-${active}`}
          className="overflow-hidden rounded-3xl border border-line bg-paper-raised shadow-window"
        >
          <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-4">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
            </span>
            <span className="truncate font-mono text-[12px] text-ink-muted">{windowTitle}</span>
            <span className="text-right font-mono text-[12px] text-ink-muted">
              {active + 1}/{steps.length}
            </span>
          </div>
          {/* altura fixa: trocar de passo não empurra a página */}
          <div key={active} className="fade-in h-[440px] overflow-hidden sm:h-[420px]">
            {current.panel}
          </div>
        </figure>
      </div>
    </div>
  );
}
