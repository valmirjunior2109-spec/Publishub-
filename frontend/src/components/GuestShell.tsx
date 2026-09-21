"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * O cabeçalho das telas de quem ainda não tem conta: a marca, o idioma e a porta
 * de entrada. Sem menu lateral — não há painel para navegar ainda.
 */
export function GuestShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Common");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-5 py-3.5 lg:px-16">
          <Link href="/" className="hover:no-underline">
            <Logo size="sm" label={t("brand")} />
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <ThemeToggle />
            <Link href="/login" className="text-[13px] text-ink-muted hover:text-ink">
              {t("signIn")}
            </Link>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
