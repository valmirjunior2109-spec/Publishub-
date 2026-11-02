"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface SimItem {
  tab: string;
  time: string;
  line: string;
  note: string;
  alt: string;
}

interface Labels {
  youSay: string;
  note: string;
  tryInstead: string;
  example: string;
}

/**
 * O simulador da landing: três frases de um roteiro de exemplo, uma por vez, com
 * a nota que a publishub deixaria e a frase sugerida no lugar. Os dados são os
 * do exemplo da página (Landing.caderno.lines), rotulados como exemplo.
 * Abas no padrão do WAI-ARIA: as setas do teclado trocam de frase.
 */
export function LineSimulator({ items, labels, label }: { items: SimItem[]; labels: Labels; label: string }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const item = items[active];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: items.length - 1 - index };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = (index + move + items.length) % items.length;
    setActive(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="mx-auto w-full max-w-[680px]">
      {/* a escolha: uma cápsula com as três frases, como um seletor */}
      <div role="tablist" aria-label={label} className="grid grid-cols-3 gap-1 rounded-xl bg-[rgba(var(--ink-rgb),0.06)] p-1">
        {items.map((it, index) => (
          <button
            key={it.tab}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${base}-panel`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              // no celular a aba quebra a linha em vez de cortar ("Die Wiederholung" não cabe em um terço da tela)
              "max-sm:min-h-11 rounded-[9px] px-1.5 py-1.5 text-[13px] font-medium leading-tight transition-colors duration-150 sm:px-2 sm:text-[14.5px]",
              index === active ? "bg-paper-raised text-ink shadow-card" : "text-ink-muted hover:text-ink",
            )}
          >
            {it.tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${active}`} key={active} className="fade-in mt-3 rounded-2xl border border-line bg-paper-raised p-5 text-left sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
            {labels.youSay} · {item.time}
          </p>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-muted">{labels.example}</span>
        </div>
        <p className="mt-3 font-display text-[20px] leading-snug text-ink-muted line-through decoration-caramel decoration-2 sm:text-[23px]">“{item.line}”</p>

        <div className="mt-5 border-l-2 border-caramel pl-4">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">{labels.note}</p>
          <p className="hand mt-1 text-[20px] first-letter:uppercase sm:text-[22px]">{item.note}</p>
        </div>

        <div className="mt-5 rounded-xl bg-surface p-4 sm:p-5">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">{labels.tryInstead}</p>
          <p className="mt-1.5 font-display text-[20px] leading-snug sm:text-[23px]">{item.alt}</p>
        </div>
      </div>
    </div>
  );
}
