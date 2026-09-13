"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales, type AppLocale } from "@/i18n/config";
import { cn } from "@/lib/cn";

const SHORT: Record<AppLocale, string> = { "pt-BR": "PT", en: "EN", es: "ES" };

/** Seletor segmentado PT | EN | ES (do design no Figma). Persiste em cookie e recarrega. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: AppLocale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t("language")} className={cn("inline-flex overflow-hidden rounded-sm border border-line", pending && "opacity-60")}>
      {locales.map((code, index) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={locale === code}
          disabled={pending}
          className={cn(
            "select-none px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.05em] transition-colors",
            index < locales.length - 1 && "border-r border-line",
            locale === code ? "bg-ink text-paper" : "bg-transparent text-ink-muted hover:text-ink",
          )}
        >
          {SHORT[code]}
        </button>
      ))}
    </div>
  );
}
