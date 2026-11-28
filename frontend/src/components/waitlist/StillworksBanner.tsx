"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PRICING_ANCHOR } from "@/lib/founding";
import { sendFunnelEvent } from "@/lib/funnel";
import type { Locale } from "@/lib/i18n";

/**
 * Quem chega pelo link do stillworks (CLI ou REPORT.md) já usa o motor grátis. Se veio de uma execução que falhou
 * (utm_source=gh_cli_fail / gh_report_fail), o bug acabou de ficar real: é o momento de oferecer o Founding.
 * Lê a URL só no navegador, para a home continuar estática.
 */
type Source = "fail" | "pass" | null;

function sourceFromUrl(): Source {
  const utm = new URLSearchParams(window.location.search).get("utm_source") ?? "";
  if (utm === "gh_cli_fail" || utm === "gh_report_fail") return "fail";
  if (utm.startsWith("gh_")) return "pass";
  return null;
}

export function StillworksBanner({ locale = "en" }: { locale?: Locale }) {
  const pt = locale === "pt";
  const [source, setSource] = useState<Source>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSource(sourceFromUrl()), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!source) return null;
  const fail = source === "fail";
  return (
    <div role="region" aria-label={pt ? "Vindo do stillworks" : "From stillworks"} className="border-b border-line bg-accent-soft">
      <div className="container-page flex flex-col gap-2 py-3 text-[15px] sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong className="font-semibold">{fail ? (pt ? "O stillworks acabou de pegar um bug antes dos seus usuários." : "stillworks just caught a bug before your users did.") : pt ? "Obrigado por usar o stillworks." : "Thanks for using stillworks."}</strong>{" "}
          {fail
            ? pt
              ? "O Publishub, em desenvolvimento, vai rodar essas mesmas verificações para você, de hora em hora, e avisar quando algo quebrar. Founding Customers terão tudo configurado 1:1."
              : "Publishub, in development, will run those same checks for you every hour and alert you when one breaks. Founding Customers will get it set up 1:1."
            : pt
              ? "Quer que rode sozinho, de hora em hora, com alertas? É isso que o Publishub está construindo."
              : "Want it running on its own, every hour, with alerts? That's what Publishub is building."}
        </p>
        <a
          href={`#${PRICING_ANCHOR}`}
          onClick={() => sendFunnelEvent("cta_click", fail ? "stillworks_banner_fail" : "stillworks_banner")}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-semibold"
        >
          {fail ? (pt ? "Reservar vaga de fundador · US$ 0 hoje" : "Reserve a founding spot · $0 today") : pt ? "Ver Founding Customers" : "See Founding Customers"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
