"use client";

import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleTheme } from "@/lib/theme";

/**
 * Claro ↔ escuro, ao lado do seletor de idioma.
 *
 * Os dois ícones estão sempre no HTML e quem decide qual aparece é o CSS
 * (`[data-theme-icon]` em globals.css). Isso evita a piscada: o servidor
 * desenha o mesmo HTML que o navegador, seja qual for o tema.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("Common");

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label={t("theme")}
      title={t("theme")}
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-colors duration-150 hover:border-[rgba(var(--ink-rgb),0.2)] hover:text-ink",
        className,
      )}
    >
      <Sun data-theme-icon="sun" size={15} strokeWidth={1.75} aria-hidden="true" />
      <Moon data-theme-icon="moon" size={15} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
