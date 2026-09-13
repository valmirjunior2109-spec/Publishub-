"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { useSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

function initialOf(name: string | undefined, email: string | undefined): string {
  return (name || email || "?").trim().charAt(0).toUpperCase() || "?";
}

/** Cabeçalho do design no Figma: logo · Dashboard · PT|EN|ES · "Nova análise". */
export function SiteHeader() {
  const t = useTranslations("Common");
  const { loading, session } = useSession();
  const router = useRouter();
  const user = session?.user;

  async function signOut() {
    await getSupabase()?.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-5 lg:px-16">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center hover:no-underline">
          <Logo size="md" label={t("brand")} />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {!loading && user && (
            <Link href="/dashboard" className="hidden text-[14px] text-ink-muted hover:text-ink hover:no-underline sm:inline">
              {t("dashboard")}
            </Link>
          )}
          <LocaleSwitcher />
          {!loading &&
            (user ? (
              <>
                <Link href="/nova-analise" className={buttonClasses("primary", "md")}>
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
                <Link href="/signup" className={buttonClasses("primary", "md")}>
                  {t("start")}
                </Link>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
