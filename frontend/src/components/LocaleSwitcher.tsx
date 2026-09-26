"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales, type AppLocale } from "@/i18n/config";
import { isPublicPath, localePath, splitLocalePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";

const SHORT: Record<AppLocale, string> = { "pt-BR": "PT", en: "EN", es: "ES" };

/**
 * Seletor segmentado PT | EN | ES (do design no Figma). Persiste em cookie.
 *
 * Nas páginas públicas cada idioma tem o seu endereço (/pt/planos, /planos,
 * /es/planos): o seletor leva para ele. Numa URL com prefixo isso é obrigatório,
 * porque o prefixo vence o cookie. No app, basta recarregar.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: AppLocale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      const { locale: fromUrl, path } = splitLocalePath(window.location.pathname);
      // cada guia existe num idioma só: em outro idioma, o equivalente é a lista de guias
      if (path.startsWith("/guias/")) router.push(localePath(next, "/guias"));
      else if (fromUrl || isPublicPath(path)) router.push(localePath(next, path) + window.location.search + window.location.hash);
      else router.refresh();
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
            "select-none px-2 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em] transition-colors sm:px-3 sm:text-[12px]",
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
