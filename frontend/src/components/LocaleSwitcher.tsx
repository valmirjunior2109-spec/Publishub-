"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE, locales, type AppLocale } from "@/i18n/config";
import { isPublicPath, localePath, splitLocalePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";

const SHORT: Record<AppLocale, string> = { "pt-BR": "PT", en: "EN", es: "ES" };

/** A escolha vale um ano. Gravada aqui mesmo: ir ao servidor só para isso era meia espera à toa. */
function rememberLocale(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Seletor segmentado PT | EN | ES.
 *
 * Dentro do app: grava o cookie e pede ao servidor só a página de novo
 * (`router.refresh`). O layout volta com as traduções do idioma novo, o cache de
 * páginas do navegador é limpo (nada fica misturado) e o que a tela já tinha
 * carregado — a análise, os vídeos — continua lá, sem chamar o backend de novo.
 * Antes era um recarregamento completo: login, dados e, com o servidor dormindo,
 * meio minuto de espera só para trocar de idioma.
 *
 * Nas páginas públicas cada idioma tem o seu endereço (/pt/planos, /planos,
 * /es/planos): o seletor leva para ele, numa navegação só.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // marca o botão escolhido na hora, enquanto o idioma novo chega
  const [chosen, setChosen] = useState<AppLocale | null>(null);

  function choose(next: AppLocale) {
    if (next === locale) return;
    setChosen(next);
    rememberLocale(next);
    const { locale: fromUrl, path } = splitLocalePath(window.location.pathname);
    // um guia traduzido tem outro slug em cada idioma: o endereço da tradução está
    // nas tags hreflang da própria página. Sem tradução, o equivalente é a lista de guias
    if (path.startsWith("/guias/")) {
      const translation = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${next}"]`);
      // só o caminho: o href é absoluto, no domínio de produção, e aqui pode ser um preview
      window.location.assign(translation ? new URL(translation.href).pathname : localePath(next, "/guias"));
      return;
    }
    // página pública: o idioma está no endereço, então o endereço muda
    if (fromUrl || isPublicPath(path)) {
      window.location.assign(localePath(next, path) + window.location.search + window.location.hash);
      return;
    }
    // app: só as traduções vêm de novo; os dados da tela ficam
    startTransition(() => router.refresh());
  }

  const shown = chosen && (pending || chosen !== locale) ? chosen : locale;

  return (
    <div role="group" aria-label={t("language")} aria-busy={pending || undefined} className="inline-flex overflow-hidden rounded-sm border border-line">
      {locales.map((code, index) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={shown === code}
          className={cn(
            "select-none px-2 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em] transition-colors duration-150 sm:px-3 sm:text-[12px]",
            index < locales.length - 1 && "border-r border-line",
            shown === code ? "bg-ink text-paper" : "bg-transparent text-ink-muted hover:text-ink",
            pending && shown === code && "animate-pulse",
          )}
        >
          {SHORT[code]}
        </button>
      ))}
    </div>
  );
}
