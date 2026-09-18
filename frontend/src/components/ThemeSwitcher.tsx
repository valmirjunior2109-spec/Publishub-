"use client";

import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/cn";
import { themes, type Theme } from "@/lib/theme";

const ICON: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const LABEL: Record<Theme, "themeLight" | "themeDark" | "themeSystem"> = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem",
};

/** Seletor segmentado ☀ | ☾ | ▭, irmão do de idioma. Troca na hora e guarda a escolha. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const { theme, setTheme } = useTheme();

  return (
    <div role="group" aria-label={t("theme")} className={cn("inline-flex overflow-hidden rounded-sm border border-line", className)}>
      {themes.map((code, index) => {
        const Icon = ICON[code];
        const label = t(LABEL[code]);
        return (
          <button
            key={code}
            type="button"
            onClick={() => setTheme(code)}
            aria-pressed={theme === code}
            title={label}
            aria-label={label}
            className={cn(
              "select-none px-2 py-1.5 transition-colors",
              index < themes.length - 1 && "border-r border-line",
              theme === code ? "bg-ink text-paper" : "bg-transparent text-ink-muted hover:text-ink",
            )}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
