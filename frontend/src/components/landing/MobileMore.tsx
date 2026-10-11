"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/**
 * "Ver mais" só no celular: no desktop tudo aparece; abaixo do `lg`, os itens marcados
 * com `MORE_HIDDEN` (mobileClasses.ts) ficam recolhidos até a pessoa tocar no botão.
 * Nada some do HTML: o Google e quem usa leitor de tela continuam vendo tudo.
 */
export function MobileMore({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("Common");
  const [open, setOpen] = useState(false);
  return (
    <div data-open={open ? "true" : "false"} className={cn("group/more", className)}>
      {children}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-accent lg:hidden"
      >
        {open ? t("showLess") : t("showMore")}
        <ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" className={cn("transition-transform duration-200", open && "rotate-180")} />
      </button>
    </div>
  );
}

/**
 * Abas só no celular: no desktop os dois lados ficam lado a lado; abaixo do `lg`, um de
 * cada vez. Cada lado leva `tabHidden(lado)` (mobileClasses.ts) na classe.
 */
export function MobileTabs({ tabs, initial, children, className }: { tabs: { id: string; label: string }[]; initial: string; children: ReactNode; className?: string }) {
  const [active, setActive] = useState(initial);
  return (
    <div data-active={active} className={cn("group/tabs", className)}>
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn("min-h-11 rounded-lg px-3 text-[14.5px] font-semibold transition-colors", active === tab.id ? "bg-paper-raised text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-muted")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
