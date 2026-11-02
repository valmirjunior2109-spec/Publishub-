"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Link2, Share2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/config";
import { capture } from "@/lib/analytics";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/events";
import { shareLink } from "@/lib/referral";
import { cardPath, sharePath } from "@/lib/share";
import { useErrorText } from "@/lib/useErrorText";
import { usePartners } from "@/lib/usePartners";

/**
 * "Mostre este resultado": o link público e o cartão para os Stories.
 *
 * O link só existe quando a pessoa cria, e some quando ela desliga. Ele mostra o
 * segundo da queda, a frase e o porquê; o vídeo e o plano continuam privados.
 * Cada cartão postado leva outro criador ao teste grátis; o link vai com o ?ref=
 * de quem compartilhou, então quem chega por ele conta como indicação (e o bônus
 * do indique e ganhe vale para os dois).
 */
export function ShareResult({ analysisId, initialToken, at, where = "results" }: { analysisId: string; initialToken: string | null; at: number; where?: string }) {
  const t = useTranslations("Share.panel");
  const locale = useLocale() as AppLocale;
  const describe = useErrorText();
  const partners = usePartners();
  const code = partners?.code ?? null;
  const bonus = code ? (partners?.bonus_per_referral ?? 0) : 0;
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // só renderiza no navegador (depois que a análise carrega): dá para perguntar direto
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

  const link = token && typeof window !== "undefined" ? shareLink(localePath(locale, sharePath(token)), "result_share", where, code) : null;
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
      capture("report_shared", analysisId, locale, { what: "result_link", method: "copy", where, with_ref: Boolean(code) });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("copyFailed"));
    }
  }

  return (
    <section className="rounded-xl border border-line bg-paper-raised p-4 sm:p-5">
      <p className="t-label flex items-center gap-2">
        <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
        {t("title")}
      </p>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">{t("lead")}</p>

      {!token ? (
        <Button variant="secondary" className="mt-4 max-sm:min-h-11" onClick={() => change("POST")} disabled={busy}>
          <Link2 size={15} strokeWidth={1.75} aria-hidden="true" />
          {busy ? t("creating") : t("create")}
        </Button>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={link ?? ""} aria-label={t("linkLabel")} onFocus={(event) => event.currentTarget.select()} className="min-h-10 max-sm:min-h-11 flex-1 rounded-[10px] border border-line bg-paper px-3 text-[13.5px] text-ink" />
            <Button variant="secondary" className="max-sm:min-h-11" onClick={copy}>
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={cardPath(token, "story", locale)}
              download={fileName}
              onClick={() => {
                track("share_card_downloaded", analysisId, { where });
                capture("report_shared", analysisId, locale, { what: "story_card", method: "download", where });
              }}
              className={buttonClasses("primary", "md", "max-sm:min-h-11")}
            >
              <Download size={15} strokeWidth={1.75} aria-hidden="true" />
              {t("story")}
            </a>
            {canShare && link && (
              <Button variant="secondary" className="max-sm:min-h-11" onClick={() =>
                  navigator
                    .share({ url: link, title: t("shareTitle") })
                    .then(() => capture("report_shared", analysisId, locale, { what: "result_link", method: "native", where, with_ref: Boolean(code) }))
                    .catch(() => undefined)
                }>
                <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
                {t("share")}
              </Button>
            )}
            <button type="button" onClick={() => change("DELETE")} disabled={busy} className="text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
              {t("turnOff")}
            </button>
          </div>
          {/* o motivo para mandar o link agora: ele também vale como indicação */}
          {bonus > 0 && (
            <p className="mt-3 rounded-lg border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft px-3 py-2 text-[13px] leading-relaxed">
              {t("bonus", { count: bonus, max: partners?.bonus_max_referrals ?? 0 })}
            </p>
          )}
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
