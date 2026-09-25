"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { capture } from "@/lib/analytics";
import { apiFetch } from "@/lib/api";
import { useErrorText } from "@/lib/useErrorText";

interface LeadResponse {
  saved: boolean;
  emailed: boolean;
  repeated: boolean;
}

/**
 * "Te mando o plano no e-mail": para quem viu a análise grátis sem conta.
 *
 * O e-mail leva a parte grátis e o link do checkout desta análise. A tela diz a
 * verdade sobre o que aconteceu: enviado, já enviado antes, ou guardado sem
 * conseguir enviar agora.
 */
export function EmailCapture({ analysisId }: { analysisId: string }) {
  const t = useTranslations("Analysis.lead");
  const locale = useLocale();
  const describe = useErrorText();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<LeadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const response = await apiFetch<LeadResponse>(`/api/analyses/${analysisId}/lead`, { method: "POST", body: { email, ui_locale: locale } });
      setResult(response);
      // o endereço não vai para o PostHog: só que ele foi deixado, e se o e-mail saiu
      capture("email_submitted", analysisId, locale, { emailed: response.emailed, repeated: response.repeated });
    } catch (err) {
      setError(describe(err));
    } finally {
      setSending(false);
    }
  }

  if (result) {
    const message = result.emailed ? t("sent", { email: email.trim() }) : result.repeated ? t("already", { email: email.trim() }) : t("savedOnly");
    return (
      <p role="status" className="mt-6 flex items-start gap-2.5 rounded-sm border border-line bg-paper p-4 text-[14px] leading-relaxed">
        <Mail size={16} strokeWidth={1.75} aria-hidden="true" className="mt-[3px] shrink-0 text-accent" />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-line pt-5">
      <label htmlFor="lead-email" className="font-display text-[16px] font-medium tracking-[-0.01em]">
        {t("title")}
      </label>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{t("lead")}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input id="lead-email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("placeholder")} disabled={sending} className="h-11" />
        <Button type="submit" variant="secondary" className="min-h-11 shrink-0" disabled={sending || !email.trim()}>
          {sending ? t("sending") : t("submit")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-refuted">
          {error}
        </p>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{t("privacy")}</p>
    </form>
  );
}
