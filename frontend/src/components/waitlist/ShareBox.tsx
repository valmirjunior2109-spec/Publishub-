"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { sendFunnelEvent } from "@/lib/funnel";
import { REFERRAL_BONUS, shareLinks } from "@/lib/waitlist";
import { buttonClasses } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n";

const COPY = {
  en: {
    moveUp: `Each friend who joins with your referral link moves you up ${REFERRAL_BONUS} spots on the waitlist.`,
    joinedCount: (n: number) => `${n} ${n === 1 ? "friend has" : "friends have"} joined with your link so far.`,
    yourLink: "Your referral link",
    copyLink: "Copy my link",
    linkCopied: "Link copied",
    shareWa: "Share on WhatsApp",
    know: "Know another developer shipping with AI? Share the waitlist.",
    shareX: "Share on X",
    shareIn: "Share on LinkedIn",
    newTab: " (opens in a new tab)",
    copyMsg: "Copy message",
    copied: "Copied. Paste it wherever your developer friends hang out.",
    failed: (text: string) => `Couldn't copy automatically. Here it is: ${text}`,
  },
  pt: {
    moveUp: `Cada amigo que entrar pela sua indicação sobe você ${REFERRAL_BONUS} posições na waitlist.`,
    joinedCount: (n: number) => `${n} ${n === 1 ? "amigo entrou" : "amigos entraram"} pelo seu link até agora.`,
    yourLink: "Seu link de indicação",
    copyLink: "Copiar meu link",
    linkCopied: "Link copiado",
    shareWa: "Compartilhar no WhatsApp",
    know: "Conhece alguém que constrói com IA? Compartilhe a lista de espera.",
    shareX: "Compartilhar no X",
    shareIn: "Compartilhar no LinkedIn",
    newTab: " (abre em nova aba)",
    copyMsg: "Copiar mensagem",
    copied: "Copiado. Cole onde seus amigos que programam estão.",
    failed: (text: string) => `Não deu para copiar automaticamente. Aqui está: ${text}`,
  },
} satisfies Record<Locale, unknown>;

/**
 * Depois da inscrição: o link pessoal de indicação (cada amigo que entra por ele sobe a pessoa
 * REFERRAL_BONUS posições) e a mensagem pronta para X e LinkedIn. Cada link leva a própria UTM.
 */
export function ShareBox({ refCode = null, referrals = 0, locale = "en" }: { refCode?: string | null; referrals?: number; locale?: Locale }) {
  const t = COPY[locale];
  const links = shareLinks(refCode, locale === "pt");
  const [copied, setCopied] = useState<"idle" | "copied" | "link" | "failed">("idle");
  const [failedText, setFailedText] = useState("");

  async function copy(text: string, detail: string) {
    sendFunnelEvent("share_click", detail);
    const ok = await copyText(text);
    setFailedText(ok ? "" : text);
    setCopied(ok ? (detail === "copy_link" ? "link" : "copied") : "failed");
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      {refCode ? (
        <>
          <p className="font-semibold">{t.moveUp}</p>
          {referrals > 0 && (
            <p className="mt-1 text-sm text-muted">{t.joinedCount(referrals)}</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="ref-link" className="sr-only">
              {t.yourLink}
            </label>
            <input id="ref-link" readOnly value={links.link} onFocus={(e) => e.currentTarget.select()} className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 font-mono text-sm text-ink" />
            <button type="button" onClick={() => void copy(links.link, "copy_link")} className={buttonClasses("primary", "md")}>
              <Copy aria-hidden="true" className="h-4 w-4" />
              {copied === "link" ? t.linkCopied : t.copyLink}
            </button>
          </div>
        </>
      ) : (
        <p className="font-semibold">{t.know}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={links.x} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "x")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t.shareX}<span className="sr-only">{t.newTab}</span>
        </a>
        <a href={links.linkedin} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "linkedin")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t.shareIn}<span className="sr-only">{t.newTab}</span>
        </a>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "whatsapp")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t.shareWa}<span className="sr-only">{t.newTab}</span>
        </a>
        <button type="button" onClick={() => void copy(links.copy, "copy")} className={buttonClasses("secondary", "md")}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          {t.copyMsg}
        </button>
      </div>
      <p role="status" className="mt-2 min-h-6 text-sm text-muted">
        {copied === "copied" ? t.copied : copied === "link" ? t.linkCopied : copied === "failed" ? t.failed(failedText) : ""}
      </p>
    </div>
  );
}
