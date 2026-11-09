"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { sendFunnelEvent } from "@/lib/funnel";
import { shareLinks } from "@/lib/waitlist";
import { buttonClasses } from "@/components/ui/Button";

/** Depois da inscrição: a mensagem pronta para X e LinkedIn, ou para copiar. Cada link leva a própria UTM. */
export function ShareBox() {
  const links = shareLinks();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    sendFunnelEvent("share_click", "copy");
    try {
      await navigator.clipboard.writeText(links.copy);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="font-semibold">Know another developer shipping with AI? Share the waitlist.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={links.x} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "x")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          Share on X<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <a href={links.linkedin} target="_blank" rel="noopener noreferrer" onClick={() => sendFunnelEvent("share_click", "linkedin")} className={buttonClasses("secondary", "md")}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          Share on LinkedIn<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" onClick={() => void copy()} className={buttonClasses("secondary", "md")}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy message
        </button>
      </div>
      <p role="status" className="mt-2 min-h-6 text-sm text-muted">
        {copied === "copied" ? "Copied. Paste it wherever your developer friends hang out." : copied === "failed" ? `Couldn't copy automatically. Here's the message: ${links.copy}` : ""}
      </p>
    </div>
  );
}
