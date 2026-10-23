"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/config";
import { PLANS } from "@/lib/pricing";
import { useSession } from "@/lib/session";
import { upgradeClicked, type ToolName } from "@/lib/toolAnalytics";

/**
 * O fim de toda ferramenta: o próximo passo é o vídeo inteiro, de graça (o /try
 * sem conta, o /new-analysis com conta). Embaixo, discreto, o que os planos pagos
 * acrescentam, com o preço de lib/pricing: nada que o produto não entregue.
 */
export function ToolCta({ where, tool, title, lead }: { where: string; tool: ToolName; title: string; lead: string }) {
  const t = useTranslations("Tools");
  const locale = useLocale() as AppLocale;
  const { session } = useSession();
  const signedIn = Boolean(session);
  return (
    <div className="mt-6 rounded-2xl border border-[rgba(var(--accent-rgb),0.3)] bg-accent-soft p-5 sm:p-6">
      <p className="font-display text-[20px] font-medium leading-snug tracking-[-0.01em]">{title}</p>
      <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-muted">{lead}</p>
      <TrackedLink
        where={where}
        href={signedIn ? "/new-analysis" : localePath(locale, "/try")}
        onClick={() => upgradeClicked(tool, `${where}_full_video`, { authenticated: signedIn, target: "full_analysis" })}
        className={buttonClasses("primary", "md", "mt-5 h-auto max-sm:min-h-11 w-full whitespace-normal px-5 py-3 text-center sm:w-auto")}
      >
        {t("cta")}
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </TrackedLink>
      <p className="mt-2.5 text-[12.5px] text-ink-muted">{signedIn ? t("ctaNoteSignedIn") : t("ctaNote")}</p>
      <p className="mt-4 border-t border-[rgba(var(--accent-rgb),0.2)] pt-4 text-[13.5px] leading-relaxed text-ink-muted">
        {t("paidNote", { price: PLANS.creator.display })}{" "}
        <TrackedLink
          where={`${where}_pricing`}
          href={localePath(locale, "/pricing")}
          onClick={() => upgradeClicked(tool, `${where}_pricing`, { authenticated: signedIn, target: "pricing" })}
          className="font-medium text-ink underline underline-offset-2"
        >
          {t("paidLink")}
        </TrackedLink>
      </p>
    </div>
  );
}
