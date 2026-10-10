"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
import { Flag } from "@/components/Flag";
import { LOCALE_COOKIE, localeNames, locales, type AppLocale } from "@/i18n/config";
import { isPublicPath, localePath, splitLocalePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";

/** A sigla do botão: a do idioma, sem a região (pt-BR → PT). */
const short = (locale: AppLocale) => locale.split("-")[0].toUpperCase();

/** A escolha vale um ano. Gravada aqui mesmo: ir ao servidor só para isso era meia espera à toa. */
function rememberLocale(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Seletor de idioma: o botão mostra a bandeira e a sigla; o menu, a bandeira e o
 * nome de cada idioma escrito nele mesmo. `placement` diz para que lado o menu
 * abre (no pé da barra lateral do app, ele precisa abrir para cima).
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
export function LocaleSwitcher({ placement = "down" }: { placement?: "down" | "up" }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // marca o botão escolhido na hora, enquanto o idioma novo chega
  const [chosen, setChosen] = useState<AppLocale | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // fecha ao clicar fora ou com Esc (e devolve o foco ao botão)
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>("button[aria-haspopup]")?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    // o foco entra no idioma atual, para as setas começarem dali
    root.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  function choose(next: AppLocale) {
    setOpen(false);
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
    <div ref={root} className="relative" aria-busy={pending || undefined}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t("language")}: ${localeNames[shown]}`}
        className={cn(
          "inline-flex h-9 select-none items-center gap-2 rounded-md border border-line px-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-ink transition-colors duration-150 hover:bg-[rgba(var(--ink-rgb),0.05)]",
          pending && "animate-pulse",
        )}
      >
        <Flag locale={shown} className="h-[14px] w-[21px]" />
        {short(shown)}
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className={cn("text-ink-muted transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("language")}
          onKeyDown={moveFocus}
          className={cn(
            "absolute right-0 z-50 max-h-[min(70vh,440px)] w-[220px] overflow-y-auto rounded-xl border border-line bg-paper-raised p-1.5 shadow-float",
            // no celular o botão fica no meio do cabeçalho: o menu ocupa a largura, com a margem da página
            placement === "up" ? "bottom-full mb-2 left-0 right-auto" : "top-full mt-2 max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:mt-0 max-sm:w-auto",
          )}
        >
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={shown === code}
              lang={code}
              onClick={() => choose(code)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.06)] focus-visible:bg-[rgba(var(--ink-rgb),0.06)] focus-visible:outline-none",
                shown === code ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              <Flag locale={code} className="h-[16px] w-[24px]" />
              <span className="min-w-0 flex-1 truncate">{localeNames[code]}</span>
              {shown === code && <Check size={15} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
