"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Scissors } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { track, useTrackOnce } from "@/lib/events";

/**
 * O lugar dos cortes numa análise bloqueada. Antes ele sumia, e justo a parte que
 * o editor mais quer (revisar os cortes e baixar o vídeo editado) não aparecia
 * como motivo para assinar. Agora aparece o que o backend manda: quantos cortes
 * e quantos segundos eles tiram, nunca os trechos.
 *
 * Convidado: criar a conta grátis abre esta análise inteira (guest_service.claim),
 * então o botão é o cadastro. Conta grátis: o botão leva às opções de plano logo abaixo.
 */
export function LockedCuts({ count, seconds, analysisId, guest }: { count: number; seconds: number; analysisId: string; guest: boolean }) {
  const t = useTranslations("Analysis.lockedCuts");
  useTrackOnce("paywall_viewed", count > 0, analysisId, { where: "cuts", guest, cuts: count });
  if (count <= 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-ink-muted">
          <Scissors size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[18px] font-semibold leading-snug tracking-[-0.02em]">{t("title", { count, seconds: seconds.toLocaleString() })}</h2>
          <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-muted">{guest ? t("guestLead") : t("lead")}</p>
          {guest ? (
            <Link href="/signup" onClick={() => track("signup_started", analysisId, { where: "locked_cuts" })} className={buttonClasses("primary", "md", "mt-4 max-sm:min-h-11")}>
              {t("signup")}
            </Link>
          ) : (
            <a href="#plan" onClick={() => track("upgrade_clicked", analysisId, { where: "locked_cuts" })} className={buttonClasses("primary", "md", "mt-4 max-sm:min-h-11")}>
              {t("cta")}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
