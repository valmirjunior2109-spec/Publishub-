"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { localePath } from "@/i18n/paths";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { signOut as encerrarSessao } from "@/lib/supabase";

function initialOf(name: string | undefined, email: string | undefined): string {
  return (name || email || "?").trim().charAt(0).toUpperCase() || "?";
}

/** Se a página já rolou alguns pixels: a cápsula do cabeçalho ganha fundo sólido e sombra. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return scrolled;
}

const NAV_LINK = "rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink hover:no-underline";
const MENU_LINK = "flex min-h-11 items-center border-b border-line text-[15px] font-semibold tracking-[-0.015em] text-ink hover:no-underline";

/**
 * O cabeçalho: logo à esquerda, o menu do site no meio, idioma, tema e a ação principal à direita.
 * Abaixo do `lg`, o menu do site vira um painel que abre por um botão (com Esc, foco e aria-expanded).
 */
export function SiteHeader() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const { loading, session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  // a tela cresceu até o menu de cima aparecer, ou Esc: o painel fecha (os links fecham ao clicar)
  useEffect(() => {
    if (!menuOpen) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setMenuOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    wide.addEventListener("change", onWide);
    document.addEventListener("keydown", onKey);
    return () => {
      wide.removeEventListener("change", onWide);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function signOut() {
    await encerrarSessao();
    router.push("/");
  }

  // o menu do site existe para quem ainda não entrou (e já no HTML do servidor, enquanto a sessão carrega)
  const siteLinks = user
    ? []
    : [
        { href: `${localePath(locale, "/")}#how-it-works`, label: t("howItWorks") },
        { href: localePath(locale, "/pricing"), label: t("plans") },
        { href: localePath(locale, "/guides"), label: t("guides") },
      ];

  return (
    // uma cápsula que flutua sobre a página (no topo da landing, dentro do palco do hero);
    // ao rolar, ganha fundo sólido e sombra. A faixa em volta não pega cliques.
    // Sem backdrop-blur: ele borrava tudo o que passava por baixo a cada quadro de rolagem
    <header className="pointer-events-none sticky top-0 z-30 px-3 pt-2 sm:px-4 sm:pt-3">
      {/* o logo e o menu à esquerda, as ações à direita; tudo na mesma altura (32 px).
          A altura total (8 + 48 px no celular, 12 + 48 px a partir do sm) é a que o hero da landing compensa */}
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-12 max-w-[1168px] items-center justify-between gap-3 rounded-full border pl-4 pr-1.5 transition-[background-color,border-color,box-shadow] duration-200 sm:pl-5",
          scrolled || menuOpen ? "border-line bg-paper-raised shadow-float" : "border-[var(--stage-line)] bg-[color-mix(in_srgb,var(--paper-raised)_72%,transparent)]",
        )}
      >
        <Link href={session ? "/dashboard" : localePath(locale, "/")} className="flex shrink-0 items-center hover:no-underline">
          {/* nos celulares mais estreitos o logo encolhe um pouco: senão a ação principal sai da tela */}
          <Logo size="md" label={t("brand")} className="max-[419px]:!text-[16px]" />
        </Link>
        <div className="hidden lg:ml-5 lg:mr-auto lg:block">
          {siteLinks.length > 0 && (
            <nav aria-label={t("siteNav")} className="flex items-center gap-0.5">
              {siteLinks.map((link) => (
                <Link key={link.href} href={link.href} className={NAV_LINK}>
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {!loading && user && (
            <Link href="/dashboard" className={cn(NAV_LINK, "hidden sm:inline")}>
              {t("dashboard")}
            </Link>
          )}
          {/* sem conta, no celular, idioma e tema moram no menu: a barra fica com a marca e a ação */}
          <span className={cn(!user && "max-sm:hidden")}>
            <LocaleSwitcher />
          </span>
          <span className={cn(user ? "max-[419px]:hidden" : "max-sm:hidden")}>
            <ThemeToggle />
          </span>
          {!loading &&
            (user ? (
              <>
                <Link href="/new-analysis" className={buttonClasses("primary", "sm", "sm:px-4")}>
                  {t("newAnalysis")}
                </Link>
                <details className="relative">
                  <summary
                    className="grid h-8 w-8 cursor-pointer select-none place-items-center rounded-full border border-line bg-surface font-display text-[13px] font-semibold text-ink transition-colors hover:border-[rgba(var(--ink-rgb),0.2)] [&::-webkit-details-marker]:hidden"
                    aria-label={t("account")}
                  >
                    {initialOf(user.user_metadata?.full_name, user.email)}
                  </summary>
                  <div className="menu-in absolute right-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-lg border border-line bg-paper-raised p-1.5 shadow-float">
                    <p className="truncate border-b border-line px-2.5 py-2 text-[13px] text-ink-muted">{user.email}</p>
                    <Link href="/dashboard" className="mt-1 block rounded-md px-2.5 py-2 text-sm text-ink hover:bg-surface hover:no-underline">
                      {t("myVideos")}
                    </Link>
                    <button type="button" onClick={signOut} className="block w-full rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-surface">
                      {t("signOut")}
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}>
                  {t("signIn")}
                </Link>
                {/* o mesmo caminho do botão principal da landing: analisar sem conta. O cadastro fica no "Entrar" */}
                <TrackedLink where="header" href={localePath(locale, "/try")} className={buttonClasses("primary", "sm", "min-w-0 sm:px-4")}>
                  <span className="truncate">{t("tryFree")}</span>
                </TrackedLink>
              </>
            ))}
          {siteLinks.length > 0 && (
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={t("menu")}
              onClick={() => setMenuOpen((open) => !open)}
              className="-mr-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)] lg:hidden"
            >
              {menuOpen ? <X size={18} strokeWidth={2} aria-hidden="true" /> : <Menu size={18} strokeWidth={2} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {/* o painel do celular: os links do site, entrar, idioma e tema */}
      {siteLinks.length > 0 && (
        <div id={menuId} hidden={!menuOpen} className="menu-in pointer-events-auto absolute inset-x-3 top-[calc(100%+6px)] rounded-2xl border border-line bg-paper-raised shadow-float sm:inset-x-4 lg:hidden">
          <nav aria-label={t("siteNav")} className="flex max-h-[calc(100dvh-80px)] flex-col overflow-y-auto px-4 pb-4 pt-1">
            {siteLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={MENU_LINK}>
                {link.label}
              </Link>
            ))}
            {!loading && !user && (
              <Link href="/login" onClick={() => setMenuOpen(false)} className={cn(MENU_LINK, "sm:hidden")}>
                {t("signIn")}
              </Link>
            )}
            <div className="mt-4 flex items-center gap-2 sm:hidden">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
