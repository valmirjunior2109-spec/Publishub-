"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { sendFunnelEvent } from "@/lib/funnel";
import { REFERRAL_BONUS, shareLinks } from "@/lib/waitlist";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Depois da inscrição: o link pessoal de indicação (cada amigo que entra por ele sobe a pessoa
 * REFERRAL_BONUS posições) e a mensagem pronta para X e LinkedIn. Cada link leva a própria UTM.
 */
export function ShareBox({ refCode = null, referrals = 0 }: { refCode?: string | null; referrals?: number }) {
  const links = shareLinks(refCode);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  async function copy(text: string, detail: string) {
    sendFunnelEvent("share_click", detail);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      {refCode ? (
        <>
          <p className="font-semibold">Move up the line: each developer who joins with your link moves you up {REFERRAL_BONUS} spots.</p>
          {referrals > 0 && (
            <p className="mt-1 text-sm text-muted">
              {referrals} {referrals === 1 ? "friend has" : "friends have"} joined with your link so far.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="ref-link" className="sr-only">
              Your referral link
            </label>
            <input id="ref-link" readOnly value={links.link} onFocus={(e) => e.currentTarget.select()} className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 font-mono text-sm text-ink" />
            <button type="button" onClick={() => void copy(links.link, "copy_link")} className={buttonClasses("primary", "md")}>
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copy link
            </button>
          </div>
        </>
      ) : (
        <p className="font-semibold">Know another developer shipping with AI? Share the waitlist.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={links.x} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "x")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          Share on X<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <a href={links.linkedin} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "linkedin")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          Share on LinkedIn<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" onClick={() => void copy(links.copy, "copy")} className={buttonClasses("secondary", "md")}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy message
        </button>
      </div>
      <p role="status" className="mt-2 min-h-6 text-sm text-muted">
        {copied === "copied" ? "Copied. Paste it wherever your developer friends hang out." : copied === "failed" ? `Couldn't copy automatically. Here it is: ${links.copy}` : ""}
      </p>
    </div>
  );
}
