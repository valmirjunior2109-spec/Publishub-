"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { localePath } from "@/i18n/paths";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { useSession } from "@/lib/session";
import { signOut as encerrarSessao } from "@/lib/supabase";

function initialOf(name: string | undefined, email: string | undefined): string {
  return (name || email || "?").trim().charAt(0).toUpperCase() || "?";
}

/** Cabeçalho do design no Figma: logo · Dashboard · PT|EN|ES · "Nova análise". */
export function SiteHeader() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const { loading, session } = useSession();
  const router = useRouter();
  const user = session?.user;

  async function signOut() {
    await encerrarSessao();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-[color-mix(in_srgb,var(--paper)_80%,transparent)] backdrop-blur-xl [border-bottom-color:rgba(var(--ink-rgb),0.07)]">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href={session ? "/dashboard" : localePath(locale, "/")} className="flex items-center hover:no-underline">
            <Logo size="md" label={t("brand")} />
          </Link>
          {/* navegação do site, só para quem ainda não entrou: quem tem conta usa o painel */}
          {!loading && !user && (
            <nav aria-label={t("siteNav")} className="hidden items-center gap-6 md:flex">
              <Link href={`${localePath(locale, "/")}#como-funciona`} className="text-[14px] font-medium text-ink-muted hover:text-ink hover:no-underline">
                {t("howItWorks")}
              </Link>
              <Link href={localePath(locale, "/planos")} className="text-[14px] font-medium text-ink-muted hover:text-ink hover:no-underline">
                {t("plans")}
              </Link>
              <Link href={localePath(locale, "/guias")} className="text-[14px] font-medium text-ink-muted hover:text-ink hover:no-underline">
                {t("guides")}
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4">
          {!loading && user && (
            <Link href="/dashboard" className="hidden text-[14px] text-ink-muted hover:text-ink hover:no-underline sm:inline">
              {t("dashboard")}
            </Link>
          )}
          <LocaleSwitcher />
          {/* em telas muito estreitas o tema segue o do sistema: o botão não cabe */}
          <span className="max-[379px]:hidden">
            <ThemeToggle />
          </span>
          {!loading &&
            (user ? (
              <>
                <Link href="/nova-analise" className={buttonClasses("primary", "sm", "sm:px-5 sm:py-2.5 sm:text-[14.5px]")}>
                  {t("newAnalysis")}
                </Link>
                <details className="relative">
                  <summary
                    className="grid h-9 w-9 cursor-pointer select-none place-items-center rounded-sm border border-line bg-paper-raised font-display text-[14px] font-medium text-ink transition-colors hover:border-ink-muted"
                    aria-label={t("account")}
                  >
                    {initialOf(user.user_metadata?.full_name, user.email)}
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-md border border-line bg-paper-raised p-1.5 shadow-float">
                    <p className="truncate border-b border-line px-2.5 py-2 text-[13px] text-ink-muted">{user.email}</p>
                    <Link href="/dashboard" className="mt-1 block rounded-sm px-2.5 py-2 text-sm text-ink hover:bg-paper hover:no-underline">
                      {t("myVideos")}
                    </Link>
                    <button type="button" onClick={signOut} className="block w-full rounded-sm px-2.5 py-2 text-left text-sm text-ink hover:bg-paper">
                      {t("signOut")}
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClasses("ghost", "md", "hidden sm:inline-flex")}>
                  {t("signIn")}
                </Link>
                <Link href="/signup" className={buttonClasses("primary", "sm", "sm:px-5 sm:py-2.5 sm:text-[14.5px]")}>
                  {t("start")}
                </Link>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
