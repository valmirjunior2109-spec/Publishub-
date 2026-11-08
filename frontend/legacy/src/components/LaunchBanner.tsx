"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { localePath } from "@/i18n/paths";
import { trafficSource } from "@/lib/referral";

const VISIT_KEY = "publishub:ph_visit";
const DISMISSED_KEY = "publishub:ph_banner_closed";

/**
 * O código de desconto do lançamento, se existir. Só aparece com a variável
 * NEXT_PUBLIC_LAUNCH_PROMO_CODE e depois de o código existir no Stripe, com
 * "Allow promotion codes" ligado nos Payment Links do Creator e do Pro.
 */
const PROMO_CODE = (process.env.NEXT_PUBLIC_LAUNCH_PROMO_CODE || "").trim();

/** Chegou pelo Product Hunt? O ?ref=producthunt que o PH põe no link, a utm, ou a página de onde veio o clique. */
function cameFromProductHunt(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (trafficSource(params.get("ref")) === "producthunt" || (params.get("utm_source") || "").toLowerCase() === "producthunt") return true;
  try {
    return /(^|\.)producthunt\.com$/.test(new URL(document.referrer).hostname);
  } catch {
    return false;
  }
}

/**
 * A faixa de boas-vindas de quem chega pelo Product Hunt: o teste grátis em um
 * clique e, se houver, o código do lançamento. Vale a visita inteira (a pessoa
 * navega e a faixa continua), some quando fecha e nunca aparece para os outros.
 */
export function LaunchBanner() {
  const t = useTranslations("Common.launch");
  const locale = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (cameFromProductHunt()) window.sessionStorage.setItem(VISIT_KEY, "1");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- o sessionStorage só existe no navegador: a faixa nasce escondida no servidor
      setShow(window.sessionStorage.getItem(VISIT_KEY) === "1" && window.sessionStorage.getItem(DISMISSED_KEY) !== "1");
    } catch {
      // armazenamento bloqueado: só esta página sabe de onde a pessoa veio
      setShow(cameFromProductHunt());
    }
  }, []);

  if (!show) return null;

  const close = () => {
    setShow(false);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // idem
    }
  };

  return (
    <div role="region" aria-label={t("label")} className="relative z-40 bg-ink text-paper">
      <div className="container-page flex min-h-11 items-center justify-center gap-x-3 gap-y-1 py-2 pr-10 text-center text-[13.5px] leading-snug max-sm:flex-col">
        <p>
          <span className="font-semibold">{t("hello")}</span> {t("text")}
          {PROMO_CODE ? <> {t.rich("code", { code: PROMO_CODE, b: (chunks) => <span className="rounded bg-[rgba(255,255,255,0.14)] px-1.5 py-0.5 font-mono font-semibold">{chunks}</span> })}</> : null}
        </p>
        <TrackedLink where="launch_banner" href={localePath(locale, "/try")} className="shrink-0 font-semibold text-paper underline underline-offset-4 hover:text-paper">
          {t("cta")} →
        </TrackedLink>
      </div>
      <button type="button" onClick={close} aria-label={t("close")} className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-paper opacity-80 hover:opacity-100 hover:bg-[rgba(255,255,255,0.1)] hover:text-paper">
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
