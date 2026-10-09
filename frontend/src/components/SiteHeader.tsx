"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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

/** Se a página já rolou alguns pixels: o cabeçalho ganha fundo e uma linha fina. */
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

const NAV_LINK = "rounded-md px-3 py-2 text-[14px] font-medium text-ink-muted transition-colors hover:text-ink hover:no-underline";

/** O cabeçalho: logo à esquerda, o menu do site no meio, idioma, tema e a ação principal à direita. */
export function SiteHeader() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const { loading, session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const scrolled = useScrolled();

  async function signOut() {
    await encerrarSessao();
    router.push("/");
  }

  return (
    // no topo o cabeçalho é a própria página; ao rolar, ganha fundo sólido e uma linha fina.
    // Sem backdrop-blur: ele borrava tudo o que passava por baixo a cada quadro de rolagem
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,border-color] duration-200",
        scrolled ? "border-line bg-paper-raised" : "border-transparent bg-paper",
      )}
    >
      {/* o logo e o menu à esquerda, as ações à direita; tudo na mesma altura (36 px) */}
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href={session ? "/dashboard" : localePath(locale, "/")} className="flex items-center hover:no-underline">
          {/* nos celulares mais estreitos o logo encolhe um pouco: senão o "Começar" sai da tela */}
          <Logo size="md" label={t("brand")} className="max-[419px]:!text-[16px]" />
        </Link>
        {/* navegação do site, só para quem ainda não entrou: quem tem conta usa o painel */}
        <div className="hidden lg:ml-8 lg:mr-auto lg:block">
          {!loading && !user && (
            <nav aria-label={t("siteNav")} className="flex items-center gap-1">
              <Link href={`${localePath(locale, "/")}#como-funciona`} className={NAV_LINK}>
                {t("howItWorks")}
              </Link>
              <Link href={localePath(locale, "/planos")} className={NAV_LINK}>
                {t("plans")}
              </Link>
              <Link href={localePath(locale, "/guias")} className={NAV_LINK}>
                {t("guides")}
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && user && (
            <Link href="/dashboard" className={cn(NAV_LINK, "hidden sm:inline")}>
              {t("dashboard")}
            </Link>
          )}
          <LocaleSwitcher />
          {/* em telas estreitas o tema segue o do sistema: o botão não cabe */}
          <span className="max-[419px]:hidden">
            <ThemeToggle />
          </span>
          {!loading &&
            (user ? (
              <>
                <Link href="/nova-analise" className={buttonClasses("primary", "sm", "sm:px-4")}>
                  {t("newAnalysis")}
                </Link>
                <details className="relative">
                  <summary
                    className="grid h-9 w-9 cursor-pointer select-none place-items-center rounded-full border border-line bg-surface font-display text-[13.5px] font-semibold text-ink transition-colors hover:border-[rgba(var(--ink-rgb),0.2)] [&::-webkit-details-marker]:hidden"
                    aria-label={t("account")}
                  >
                    {initialOf(user.user_metadata?.full_name, user.email)}
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-lg border border-line bg-paper-raised p-1.5 shadow-float">
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
                {/* o mesmo caminho do botão principal da landing: testar sem conta. O cadastro fica no "Entrar" */}
                <TrackedLink where="header" href={localePath(locale, "/experimentar")} className={buttonClasses("primary", "sm", "sm:px-4")}>
                  {t("tryFree")}
                </TrackedLink>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
