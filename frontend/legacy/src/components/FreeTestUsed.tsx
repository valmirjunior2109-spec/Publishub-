"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";

/**
 * No lugar da área de envio, para quem já usou o teste grátis: ninguém escolhe um
 * arquivo para descobrir no fim que não dá. `analysisHref`: a análise que este
 * navegador já fez; sem ela, o caminho de volta é entrar na conta.
 */
export function FreeTestUsed({ analysisHref }: { analysisHref?: string | null }) {
  const t = useTranslations("Try");
  return (
    <div className="rounded-lg border border-line bg-paper-raised p-5">
      <p className="font-serif text-[22px] leading-snug tracking-[-0.012em]">{t("usedTitle")}</p>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{t("usedText")}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href={analysisHref ?? "/login"} className={buttonClasses("primary", "md", "max-sm:min-h-11")}>
          {analysisHref ? t("previous.cta") : t("signIn")}
        </Link>
        <Link href="/pricing" className={buttonClasses("secondary", "md", "max-sm:min-h-11")}>
          {t("usedPlans")}
        </Link>
      </div>
    </div>
  );
}
