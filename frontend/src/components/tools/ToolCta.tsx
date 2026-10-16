"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/config";

/** O fim de toda ferramenta: o próximo passo é o vídeo inteiro, de graça. */
export function ToolCta({ where, title, lead }: { where: string; title: string; lead: string }) {
  const t = useTranslations("Tools");
  const locale = useLocale() as AppLocale;
  return (
    <div className="mt-8 rounded-[24px] border border-[rgba(var(--accent-rgb),0.3)] bg-accent-soft p-5 sm:p-7">
      <p className="font-display text-[22px] font-medium leading-snug tracking-[-0.01em]">{title}</p>
      <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-muted">{lead}</p>
      <TrackedLink where={where} href={localePath(locale, "/try")} className={buttonClasses("primary", "md", "mt-5 h-auto min-h-12 w-full whitespace-normal px-6 py-3 text-center sm:w-auto")}>
        {t("cta")}
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </TrackedLink>
      <p className="mt-2.5 text-[12.5px] text-ink-muted">{t("ctaNote")}</p>
    </div>
  );
}
