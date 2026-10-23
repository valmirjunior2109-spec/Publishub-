"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { ToolCta } from "@/components/tools/ToolCta";
import { localePath } from "@/i18n/paths";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { captureTool, toolCompleted, toolFailed, toolStarted } from "@/lib/toolAnalytics";
import { useErrorText } from "@/lib/useErrorText";

interface HookResult {
  score: number;
  verdict: string;
  rewrites: { text: string; why: string }[];
}

interface Scored {
  hook: string;
  score: number;
}

const MAX = 300;
/** As frases avaliadas nesta aba, para comparar: ficam só no navegador, nunca vão para a medição. */
const HISTORY_KEY = "publishub:hook_history";
const HISTORY_MAX = 8;
/** O limite diário das ferramentas: a saída é o vídeo inteiro, de graça. */
const LIMIT_CODES = new Set(["TOOLS_LIMIT", "TOOLS_BUSY"]);

const toneOf = (score: number) => (score >= 7 ? "text-confirmed" : score >= 4 ? "text-pending" : "text-refuted");

function readHistory(): Scored[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(HISTORY_KEY) || "[]") as Scored[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item?.hook === "string" && typeof item?.score === "number") : [];
  } catch {
    return [];
  }
}

function saveHistory(history: Scored[]): void {
  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // sem armazenamento: a comparação vale até recarregar a página
  }
}

/**
 * A nota do gancho: a frase de abertura vira uma nota de 0 a 10, o porquê e três
 * versões melhores. Sem conta, sem vídeo: só o texto.
 *
 * Cada frase avaliada entra na comparação desta aba (sem chamada a mais à IA), e
 * uma reescrita pode ser avaliada com um clique: é o caminho de testar versões
 * antes de gravar.
 */
export function HookTool() {
  const t = useTranslations("Tools.hook");
  const tLab = useTranslations("HookLab");
  const locale = useLocale();
  const describe = useErrorText();
  const [hook, setHook] = useState("");
  const [result, setResult] = useState<HookResult | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<Scored[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // uma vez por visita: a entrada do funil
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    captureTool("free_tool_viewed", "hook_score");
    // a comparação desta aba volta depois de recarregar (sessionStorage não existe no servidor)
    setHistory(readHistory());
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const text = hook.trim();
    if (text.length < 3) return setError(t("tooShort"));
    setBusy(true);
    setError(null);
    setLimited(false);
    toolStarted("hook_score", { length: text.length, compared: history.length });
    try {
      const scored = await apiFetch<HookResult>("/api/tools/hook", { method: "POST", body: { hook: text, locale } });
      setResult(scored);
      setCurrent(text);
      const next = [{ hook: text, score: scored.score }, ...history.filter((item) => item.hook !== text)].slice(0, HISTORY_MAX);
      setHistory(next);
      saveHistory(next);
      toolCompleted("hook_score", { score: scored.score, compared: next.length });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "UNKNOWN";
      setLimited(LIMIT_CODES.has(code));
      setError(describe(err));
      toolFailed("hook_score", code);
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

  /** Leva uma reescrita (ou uma frase nova) para a caixa, pronta para avaliar. */
  function edit(text: string) {
    setHook(text.slice(0, MAX));
    setError(null);
    input.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    input.current?.focus({ preventScroll: true });
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  const ranked = [...history].sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score;

  return (
    <div>
      <form onSubmit={submit} className="rounded-[24px] border border-line bg-paper-raised p-5 sm:p-6">
        <label htmlFor="hook" className="t-label">
          {t("label")}
        </label>
        <textarea
          id="hook"
          ref={input}
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
          <Button type="submit" className="min-h-11 px-6" disabled={busy} aria-busy={busy}>
            {busy ? t("scoring") : t("submit")}
          </Button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper-raised p-3 text-[14px] text-refuted">
          {error}
        </p>
      )}
      {/* o limite do dia: a nota acabou, o vídeo inteiro continua de graça */}
      {limited && !result && <ToolCta where="tool_hook_limit" tool="hook_score" title={t("ctaTitle")} lead={t("ctaLead")} />}

      {result && (
        <section aria-live="polite" className="mt-8 rounded-[24px] border border-line bg-paper-raised p-6 sm:p-8">
          <p className="t-label">{t("resultLabel")}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={cn("font-serif text-[72px] font-medium leading-none tracking-[-0.04em] tabular-nums", toneOf(result.score))}>{result.score}</span>
            <span className="text-[20px] text-ink-muted">/10</span>
          </p>
          {current && <p className="mt-3 max-w-[60ch] text-[14px] italic leading-relaxed text-ink-muted">“{current}”</p>}
          <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed">{result.verdict}</p>

          <p className="t-label mt-8">{t("rewrites")}</p>
          <ol className="mt-3 flex flex-col gap-3">
            {result.rewrites.map((rewrite, index) => (
              <li key={rewrite.text} className="rounded-[16px] border border-line bg-paper p-4">
                <p className="text-[16px] font-medium leading-snug">“{rewrite.text}”</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{rewrite.why}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <button type="button" onClick={() => copy(rewrite.text, index)} className="min-h-8 text-[12.5px] font-medium text-accent hover:underline">
                    {copied === index ? t("copied") : t("copy")}
                  </button>
                  <button type="button" onClick={() => edit(rewrite.text)} className="min-h-8 text-[12.5px] font-medium text-accent hover:underline">
                    {t("scoreThis")}
                  </button>
                </div>
              </li>
            ))}
          </ol>

          {/* o próximo passo: cinco aberturas por ângulo, ajustáveis, no Hook Lab */}
          {current && (
            <Link
              href={`${localePath(locale, "/tools/hook-lab")}?line=${encodeURIComponent(current)}`}
              onClick={() => captureTool("upgrade_cta_clicked", "hook_score", { placement: "hook_to_lab", target: "hook_lab" })}
              className="mt-5 inline-flex min-h-9 items-center text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
            >
              {tLab("openInLab")} →
            </Link>
          )}

          <Button variant="secondary" className="mt-6 min-h-11" onClick={() => edit("")}>
            <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />
            {t("another")}
          </Button>

          <ToolCta where="tool_hook" tool="hook_score" title={t("ctaTitle")} lead={t("ctaLead")} />
        </section>
      )}

      {/* a comparação: as frases desta aba, da maior nota para a menor */}
      {ranked.length >= 2 && (
        <section aria-labelledby="hook-compare" className="mt-8 rounded-[24px] border border-line bg-paper-raised p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="hook-compare" className="t-label">
              {t("compareTitle")}
            </h2>
            <button type="button" onClick={clearHistory} className="min-h-8 text-[12.5px] font-medium text-ink-muted hover:text-ink hover:underline">
              {t("compareClear")}
            </button>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{t("compareNote")}</p>
          <ol className="mt-4 flex flex-col">
            {ranked.map((item) => (
              <li key={item.hook} className="flex items-start gap-4 border-b border-line py-3 last:border-b-0">
                <span className={cn("w-12 shrink-0 font-display text-[22px] font-medium tabular-nums leading-tight", toneOf(item.score))}>
                  {item.score}
                  <span className="text-[13px] text-ink-muted">/10</span>
                </span>
                <span className="min-w-0 flex-1 text-[14.5px] leading-relaxed">
                  “{item.hook}”
                  {item.score === best && <span className="ml-2 whitespace-nowrap rounded-full border border-line px-2 py-px text-[11.5px] font-medium text-confirmed">{t("compareBest")}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
