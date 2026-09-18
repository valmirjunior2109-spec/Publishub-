"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { referralLink } from "@/lib/referral";

/** O link de indicação (/?ref=CODE) com o botão de copiar: o mesmo no painel e na área do Partner. */
export function ReferralLinkField({ code }: { code: string }) {
  const t = useTranslations("Partners");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const link = referralLink(code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: o link continua visível para copiar à mão
    }
  }

  return (
    <div>
      <p className="t-label">{t("yourLink")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-paper px-3 py-2 font-sans text-[13.5px] text-ink">{link}</code>
        <Button variant={copied ? "secondary" : "primary"} size="sm" onClick={copy} aria-live="polite" className="min-w-[132px]">
          {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
    </div>
  );
}
