"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";
import { buttonClasses } from "@/components/ui/Button";
import { useTrackOnce } from "@/lib/events";
import { OFFER } from "@/lib/pricing";

/**
 * O lugar das reescritas e do copiloto, para quem está no grátis. As frases de
 * verdade não vêm do backend nesta conta, então o que se desfoca aqui é um
 * rascunho: o que está escondido é a posição, não o conteúdo.
 */
export function LockedRewrites({ count, analysisId }: { count: number; analysisId?: string }) {
  const t = useTranslations("Analysis.locked");
  useTrackOnce("paywall_viewed", true, analysisId ?? null, { where: "rewrites", locked_items: count });

  return (
    <div className="relative">
      {/* o rascunho desfocado: barras no lugar das frases, sem texto para ler */}
      <div aria-hidden="true" className="grid items-start gap-4 blur-[5px] md:grid-cols-[1.15fr_0.93fr_0.93fr]">
        {Array.from({ length: Math.max(1, count) }).map((_, index) => (
          <div key={index} className={`flex h-full flex-col gap-3 rounded-md border p-6 ${index === 0 ? "border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft" : "border-line bg-paper-raised"}`}>
            <span className="h-2 w-16 rounded-sm bg-ink/15" />
            <span className="h-3.5 w-full rounded-sm bg-ink/15" />
            <span className="h-3.5 w-11/12 rounded-sm bg-ink/15" />
            <span className="h-3.5 w-7/12 rounded-sm bg-ink/15" />
            <span className="mt-2 h-2.5 w-9/12 rounded-sm bg-ink/10" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[420px] rounded-md border border-line bg-paper-raised/95 p-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <span aria-hidden="true" className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-line text-ink-muted">
            <Lock size={16} strokeWidth={1.75} />
          </span>
          <p className="mt-3.5 font-display text-[19px] font-medium leading-snug tracking-tight">{t("title", { count })}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
          <CheckoutButton where="rewrites" analysisId={analysisId} className={buttonClasses("primary", "md", "mt-5 min-h-12 w-full px-6")}>
            {t("cta", { price: OFFER.display })}
          </CheckoutButton>
          <p className="mt-2.5 text-[12px] text-ink-muted">{t("once")}</p>
        </div>
      </div>
    </div>
  );
}
