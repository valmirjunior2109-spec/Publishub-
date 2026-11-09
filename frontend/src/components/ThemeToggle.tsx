"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEME_KEY } from "@/lib/theme";

/** O escuro (Midnight) é o padrão da marca; o claro só vale quando escolhido no botão. */
function resolvedTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Botão de tema claro/escuro. É um botão de alternância (aria-pressed = tema escuro ligado),
 * com nome acessível fixo. Sem escolha salva, o tema é o escuro.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, resolvedTheme, () => null);
  const dark = theme === "dark";

  function toggle() {
    const next = resolvedTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // navegação privada: vale só nesta visita
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === null ? undefined : dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-line-strong bg-card text-ink transition-colors hover:border-accent hover:bg-surface",
        className,
      )}
    >
      <Sun aria-hidden="true" className={cn("h-[18px] w-[18px] transition-all duration-300", dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
      <Moon aria-hidden="true" className={cn("absolute h-[18px] w-[18px] transition-all duration-300", dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
    </button>
  );
}
