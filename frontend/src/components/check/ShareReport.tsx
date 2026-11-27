"use client";

import { useId, useState } from "react";
import { Share2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useJoined } from "@/components/waitlist/joined";
import { track } from "@/lib/analytics";
import { shareSummaryText, type PublicSummary } from "@/lib/check/issues";
import { sharedSummaryUrl } from "@/lib/check/share";
import { sendFunnelEvent } from "@/lib/funnel";
import type { Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { CopyButton } from "./CopyButton";

const COPY = {
  en: {
    title: "Share your result",
    privacy: "The post shows only the number of problems of each type. No screenshots, error messages or anything from inside your app, and no URL unless you choose to add it.",
    include: "Include my app's address",
    includeHint: "Only the domain (like myapp.com), never the page or anything after it.",
    preview: "What you'll share",
    copy: "Copy text",
    copied: "Text copied",
    failed: "Couldn't copy automatically. Select the text below and copy it:",
    x: "Share on X",
    linkedin: "Share on LinkedIn",
    newTab: " (opens in a new tab)",
  },
  pt: {
    title: "Compartilhar resultado",
    privacy: "O post mostra só quantos problemas de cada tipo o teste encontrou. Nada de prints, mensagens de erro ou qualquer coisa de dentro do seu app, e nenhuma URL, a não ser que você escolha incluir.",
    include: "Incluir o endereço do meu app",
    includeHint: "Só o domínio (como meuapp.com), nunca a página nem o que vem depois.",
    preview: "O que você vai compartilhar",
    copy: "Copiar texto",
    copied: "Texto copiado",
    failed: "Não deu para copiar automaticamente. Selecione o texto abaixo e copie:",
    x: "Compartilhar no X",
    linkedin: "Compartilhar no LinkedIn",
    newTab: " (abre em nova aba)",
  },
} satisfies Record<Locale, unknown>;

function originOf(url: string): { origin: string; host: string } | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? { origin: parsed.origin, host: parsed.hostname } : null;
  } catch {
    return null;
  }
}

/**
 * O compartilhamento seguro do resultado: um texto curto, só com contagens por tipo, e o link para o
 * /check/shared (que tem a prévia com o placar). A URL do app só entra se a pessoa marcar, e só o domínio.
 * Quem já está na lista leva o próprio código de indicação no link.
 */
export function ShareReport({ summary, appUrl, locale }: { summary: PublicSummary; appUrl: string; locale: Locale }) {
  const t = COPY[locale];
  const id = useId();
  const [includeApp, setIncludeApp] = useState(false);
  const refCode = useJoined()?.refCode ?? null;
  const app = originOf(appUrl);
  const appHost = includeApp && app ? app.host : null;
  const appOrigin = includeApp && app ? app.origin : null;

  const link = (network: string) => sharedSummaryUrl(SITE_URL, summary, network, { refCode, appHost, locale });
  const text = (network: string) => shareSummaryText(summary, locale, link(network), appOrigin);
  const xText = shareSummaryText(summary, locale, "", appOrigin).trimEnd();
  const x = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: xText, url: link("x") })}`;
  // o compartilhamento do feed aceita o texto pronto; o share-offsite oficial só aceita a URL
  const linkedin = `https://www.linkedin.com/feed/?${new URLSearchParams({ shareActive: "true", text: text("linkedin") })}`;

  const tracked = (network: string) => () => {
    sendFunnelEvent("share_click", `check_${network}`);
    track("app_check_shared", { network, include_app: includeApp });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-md border border-line bg-surface p-4 sm:p-5">
      <h3 id={`${id}-title`} className="flex items-center gap-2 text-lg font-bold">
        <Share2 aria-hidden="true" className="h-5 w-5" />
        {t.title}
      </h3>
      <p className="mt-1 text-sm text-muted">{t.privacy}</p>

      <div className="mt-3 flex items-start gap-2">
        <input id={`${id}-include`} type="checkbox" checked={includeApp} onChange={(e) => setIncludeApp(e.target.checked)} disabled={!app} className="mt-1 h-5 w-5 shrink-0 accent-[var(--action)]" />
        <label htmlFor={`${id}-include`} className="text-[15px]">
          <span className="font-semibold">{t.include}</span>
          <span className="block text-sm text-muted">{t.includeHint}</span>
        </label>
      </div>

      <p className="mt-4 text-sm font-semibold">{t.preview}</p>
      <blockquote className="mt-1 whitespace-pre-line break-words rounded-md border border-line bg-card p-3 text-[15px]">{text("copy")}</blockquote>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <CopyButton text={() => text("copy")} label={t.copy} copiedLabel={t.copied} failedLabel={t.failed} onCopy={(ok) => ok && tracked("copy")()} />
        <a href={x} target="_blank" rel="noopener noreferrer" onClick={tracked("x")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t.x}
          <span className="sr-only">{t.newTab}</span>
        </a>
        <a href={linkedin} target="_blank" rel="noopener noreferrer" onClick={tracked("linkedin")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t.linkedin}
          <span className="sr-only">{t.newTab}</span>
        </a>
      </div>
    </section>
  );
}
