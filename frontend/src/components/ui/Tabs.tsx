"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Abas: uma coisa de cada vez, no lugar de várias seções longas empilhadas.
 * As setas do teclado trocam de aba, como o padrão de abas do WAI-ARIA pede.
 */
export function Tabs({ tabs, label, className }: { tabs: TabItem[]; label: string; className?: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: tabs.length - 1 - index };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = (index + move + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    buttons.current[next]?.focus();
  }

  if (!current) return null;

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((tab, index) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
                selected ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel-${current.id}`} aria-labelledby={`${base}-tab-${current.id}`} tabIndex={0} className="pt-5 focus:outline-none">
        {current.content}
      </div>
    </div>
  );
}
