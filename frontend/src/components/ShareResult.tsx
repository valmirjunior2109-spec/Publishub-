"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Link2, Share2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/config";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/events";
import { cardPath, sharePath } from "@/lib/share";
import { useErrorText } from "@/lib/useErrorText";

/**
 * "Mostre este resultado": o link público e o cartão para os Stories.
 *
 * O link só existe quando a pessoa cria, e some quando ela desliga. Ele mostra o
 * segundo da queda, a frase e o porquê; o vídeo e o plano continuam privados.
 * Cada cartão postado leva outro criador ao teste grátis.
 */
export function ShareResult({ analysisId, initialToken, at }: { analysisId: string; initialToken: string | null; at: number }) {
  const t = useTranslations("Share.panel");
  const locale = useLocale() as AppLocale;
  const describe = useErrorText();
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // só renderiza no navegador (depois que a análise carrega): dá para perguntar direto
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

  const link = token ? `${typeof window === "undefined" ? "" : window.location.origin}${localePath(locale, sharePath(token))}` : null;
  const fileName = `publishub-${Math.floor(at / 60)}-${String(Math.round(at) % 60).padStart(2, "0")}.png`;

  async function change(method: "POST" | "DELETE") {
    setBusy(true);
    setError(null);
    try {
      const { token: next } = await apiFetch<{ token: string | null }>(`/api/analyses/${analysisId}/share`, { method });
      setToken(next);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("copyFailed"));
    }
  }

  return (
    <section className="rounded-md border border-line bg-paper-raised p-5 sm:p-6">
      <p className="t-label flex items-center gap-2">
        <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
        {t("title")}
      </p>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">{t("lead")}</p>

      {!token ? (
        <Button variant="secondary" className="mt-4 min-h-11" onClick={() => change("POST")} disabled={busy}>
          <Link2 size={15} strokeWidth={1.75} aria-hidden="true" />
          {busy ? t("creating") : t("create")}
        </Button>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={link ?? ""} aria-label={t("linkLabel")} onFocus={(event) => event.currentTarget.select()} className="min-h-11 flex-1 rounded-[10px] border border-line bg-paper px-3 text-[13.5px] text-ink" />
            <Button variant="secondary" className="min-h-11" onClick={copy}>
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={cardPath(token, "story", locale)}
              download={fileName}
              onClick={() => track("share_card_downloaded", analysisId, { where: "results" })}
              className={buttonClasses("primary", "md", "min-h-11")}
            >
              <Download size={15} strokeWidth={1.75} aria-hidden="true" />
              {t("story")}
            </a>
            {canShare && link && (
              <Button variant="secondary" className="min-h-11" onClick={() => navigator.share({ url: link, title: t("shareTitle") }).catch(() => undefined)}>
                <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
                {t("share")}
              </Button>
            )}
            <button type="button" onClick={() => change("DELETE")} disabled={busy} className="text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
              {t("turnOff")}
            </button>
          </div>
          <p className="mt-2.5 text-[12.5px] text-ink-muted">{t("privacy")}</p>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-refuted">
          {error}
        </p>
      )}
    </section>
  );
}
