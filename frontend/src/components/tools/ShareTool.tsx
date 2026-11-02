"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/config";
import { shareLink } from "@/lib/referral";
import { captureTool, type ToolName } from "@/lib/toolAnalytics";
import { usePartners } from "@/lib/usePartners";

const TOOL_PATH: Record<ToolName, string> = {
  video_audit: "/tools/video-audit",
  retention_curve: "/tools/retention-curve",
  hook_score: "/tools/hook-score",
  hook_lab: "/tools/hook-lab",
};

/**
 * O link da ferramenta para mandar a outro criador, editor ou agência.
 *
 * Vai com utm_source=share (é o que separa, no first_source de quem chega, a
 * visita que veio de um compartilhamento) e, para quem tem conta, com o ?ref= do
 * Publishub Partners: o mesmo código do painel, que o ReferralCapture já lê.
 * Nada da pessoa nem do resultado vai no link: é só o endereço da ferramenta.
 */
export function ShareTool({ tool, className }: { tool: ToolName; className?: string }) {
  const t = useTranslations("Tools.share");
  const tName = useTranslations("Tools");
  const locale = useLocale() as AppLocale;
  // só com conta: o código de indicação dela (o mesmo do painel do Partners)
  const code = usePartners()?.code ?? null;
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = shareLink(localePath(locale, TOOL_PATH[tool]), "tool_share", tool, code);
    const key = tool === "video_audit" ? "audit" : tool === "retention_curve" ? "curve" : "hook";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: tName(`${key}.name`), text: t("text") });
        captureTool("report_shared", tool, { what: "tool_link", method: "native", with_ref: Boolean(code) });
      } catch {
        // a pessoa fechou a janela de compartilhar: não é um compartilhamento
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      captureTool("report_shared", tool, { what: "tool_link", method: "copy", with_ref: Boolean(code) });
    } catch {
      // sem clipboard: o link aparece para copiar à mão
      setManual(url);
    }
  }

  return (
    <div className={className}>
      <Button variant="ghost" size="sm" onClick={share} aria-live="polite" className="-ml-2 max-sm:min-h-11">
        {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />}
        {copied ? t("copied") : t("button")}
      </Button>
      {manual && (
        <input
          readOnly
          value={manual}
          aria-label={t("button")}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 min-h-10 max-sm:min-h-11 w-full rounded-[10px] border border-line bg-paper px-3 text-[13.5px] text-ink"
        />
      )}
    </div>
  );
}
