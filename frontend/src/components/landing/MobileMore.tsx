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
        className="mt-4 inline-flex min-h-10 max-sm:min-h-11 items-center gap-1.5 text-[15px] font-semibold text-accent lg:hidden"
      >
        {open ? t("showLess") : t("showMore")}
        <ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" className={cn("transition-transform duration-200", open && "rotate-180")} />
      </button>
    </div>
  );
}
