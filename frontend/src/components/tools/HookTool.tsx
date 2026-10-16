"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ToolCta } from "@/components/tools/ToolCta";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useErrorText } from "@/lib/useErrorText";

interface HookResult {
  score: number;
  verdict: string;
  rewrites: { text: string; why: string }[];
}

const MAX = 300;

/**
 * A nota do gancho: a frase de abertura vira uma nota de 0 a 10, o porquê e três
 * versões melhores. Sem conta, sem vídeo: só o texto.
 */
export function HookTool() {
  const t = useTranslations("Tools.hook");
  const locale = useLocale();
  const describe = useErrorText();
  const [hook, setHook] = useState("");
  const [result, setResult] = useState<HookResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hook.trim().length < 3) return setError(t("tooShort"));
    setBusy(true);
    setError(null);
    try {
      setResult(await apiFetch<HookResult>("/api/tools/hook", { method: "POST", body: { hook, locale } }));
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* o texto continua na tela para copiar à mão */
    }
  }

  const tone = result ? (result.score >= 7 ? "text-confirmed" : result.score >= 4 ? "text-pending" : "text-refuted") : "";

  return (
    <div>
      <form onSubmit={submit} className="rounded-[24px] border border-line bg-paper-raised p-5 sm:p-6">
        <label htmlFor="hook" className="t-label">
          {t("label")}
        </label>
        <textarea
          id="hook"
          value={hook}
          maxLength={MAX}
          rows={3}
          onChange={(event) => setHook(event.target.value)}
          placeholder={t("placeholder")}
          className="mt-3 w-full resize-y rounded-[12px] border border-line bg-paper p-3 text-[16px] leading-relaxed text-ink outline-none focus:border-[rgba(var(--accent-rgb),0.6)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] tabular-nums text-ink-muted">
            {hook.length}/{MAX}
          </span>
          <Button type="submit" className="min-h-11 px-6" disabled={busy}>
            {busy ? t("scoring") : t("submit")}
          </Button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper-raised p-3 text-[14px] text-refuted">
          {error}
        </p>
      )}

      {result && (
        <section aria-live="polite" className="mt-8 rounded-[24px] border border-line bg-paper-raised p-6 sm:p-8">
          <p className="t-label">{t("resultLabel")}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={cn("font-serif text-[72px] font-medium leading-none tracking-[-0.04em] tabular-nums", tone)}>{result.score}</span>
            <span className="text-[20px] text-ink-muted">/10</span>
          </p>
          <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed">{result.verdict}</p>

          <p className="t-label mt-8">{t("rewrites")}</p>
          <ol className="mt-3 flex flex-col gap-3">
            {result.rewrites.map((rewrite, index) => (
              <li key={rewrite.text} className="rounded-[16px] border border-line bg-paper p-4">
                <p className="text-[16px] font-medium leading-snug">“{rewrite.text}”</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{rewrite.why}</p>
                <button type="button" onClick={() => copy(rewrite.text, index)} className="mt-2 text-[12.5px] font-medium text-accent hover:underline">
                  {copied === index ? t("copied") : t("copy")}
                </button>
              </li>
            ))}
          </ol>
          <ToolCta where="tool_hook" title={t("ctaTitle")} lead={t("ctaLead")} />
        </section>
      )}
    </div>
  );
}
