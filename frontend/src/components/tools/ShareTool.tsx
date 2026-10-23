"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/config";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";
import { captureTool, type ToolName } from "@/lib/toolAnalytics";
import type { Partners } from "@/lib/types";

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
  const { session } = useSession();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  // só com conta: o código de indicação dela (o mesmo do painel do Partners)
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    apiFetch<Partners>("/api/partners")
      .then((partners) => alive && partners.available && setCode(partners.code))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function link(): string {
    const url = new URL(localePath(locale, TOOL_PATH[tool]), window.location.origin);
    url.searchParams.set("utm_source", "share");
    url.searchParams.set("utm_medium", "tool_share");
    url.searchParams.set("utm_campaign", tool);
    if (code) url.searchParams.set("ref", code);
    return url.toString();
  }

  async function share() {
    const url = link();
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
      <Button variant="ghost" size="sm" onClick={share} aria-live="polite" className="-ml-2 min-h-11">
        {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />}
        {copied ? t("copied") : t("button")}
      </Button>
      {manual && (
        <input
          readOnly
          value={manual}
          aria-label={t("button")}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-paper px-3 text-[13.5px] text-ink"
        />
      )}
    </div>
  );
}
