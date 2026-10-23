"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, RefreshCw, SlidersHorizontal } from "lucide-react";
import { ToolCta } from "@/components/tools/ToolCta";
import { Button, buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { capture } from "@/lib/analytics";
import { apiFetch, ApiError } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { captureTool, toolCompleted, toolFailed, toolStarted, upgradeClicked } from "@/lib/toolAnalytics";
import { useErrorText } from "@/lib/useErrorText";
import { cn } from "@/lib/cn";

type Category = "curiosity" | "direct" | "educational" | "story" | "contrarian";
type Alternative = { category: Category; text: string; why: string; on_screen_text: string; delivery: string };
type LabResult = {
  source: "analysis" | "transcript";
  language: string | null;
  opening: { text: string; start_seconds: number | null; end_seconds: number | null };
  context: string | null;
  summary: string;
  weaknesses: string[];
  alternatives: Alternative[];
  audit_hook: { score: number | null; note: string | null } | null;
};

const OPENING_MAX = 300;
const CONTEXT_MAX = 4000;
const LIMIT_CODES = new Set(["TOOLS_LIMIT", "TOOLS_BUSY"]);
const QUICK = ["shorter", "casual", "direct", "noQuestion"] as const;

/**
 * Hook Lab: a abertura de um vídeo → os pontos fracos dela e cinco aberturas
 * novas, uma por ângulo, que dá para copiar, escolher, gerar de novo ou ajustar.
 *
 * Duas entradas, as que o produto já tem: `?analysis=<id>` (a transcrição de uma
 * análise ou auditoria pronta, com os segundos de verdade) ou a abertura colada
 * (e o resto da fala, se houver; `?line=` já preenche). Não há envio de vídeo
 * aqui: quem não tem a transcrição vai para a auditoria grátis.
 */
export function HookLab() {
  const t = useTranslations("HookLab");
  const tTools = useTranslations("Tools.lab");
  const locale = useLocale();
  const describe = useErrorText();
  const params = useSearchParams();
  const analysisId = params.get("analysis");

  const [opening, setOpening] = useState(() => (params.get("line") ?? "").slice(0, OPENING_MAX));
  const [context, setContext] = useState("");
  const [result, setResult] = useState<LabResult | null>(null);
  const [busy, setBusy] = useState<"generate" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [refining, setRefining] = useState<number | null>(null);
  const [instruction, setInstruction] = useState("");
  const [refineBusy, setRefineBusy] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const results = useRef<HTMLElement>(null);

  const source = analysisId ? "analysis" : "transcript";

  // uma vez por visita: a entrada do funil
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    captureTool("free_tool_viewed", "hook_lab", { source });
  }, [source]);

  const run = useCallback(
    async (mode: "generate" | "regenerate", avoid: string[] = []) => {
      setBusy(mode);
      setError(null);
      setLimited(false);
      if (mode === "generate") toolStarted("hook_lab", { source });
      else capture("hook_regenerated", analysisId, locale, { tool: "hook_lab", source });
      try {
        const data = analysisId
          ? await apiFetch<LabResult>(`/api/tools/hook-lab/analyses/${analysisId}`, { method: "POST", body: { locale, avoid } })
          : await apiFetch<LabResult>("/api/tools/hook-lab", { method: "POST", body: { opening: opening.trim(), context: context.trim() || null, locale, avoid } });
        setResult(data);
        setChosen(null);
        setRefining(null);
        if (mode === "generate") toolCompleted("hook_lab", { source, with_context: Boolean(data.context) });
        window.requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "UNKNOWN";
        setLimited(LIMIT_CODES.has(code));
        setError(describe(err));
        toolFailed("hook_lab", code, { source, regenerate: mode === "regenerate" });
      } finally {
        setBusy(null);
      }
    },
    [analysisId, context, describe, locale, opening, source],
  );

  // vindo da auditoria ou da análise: a pessoa já pediu as aberturas, a primeira rodada começa sozinha
  const started = useRef(false);
  useEffect(() => {
    if (!analysisId || started.current) return;
    started.current = true;
    void run("generate");
  }, [analysisId, run]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (opening.trim().length < 3) return setError(t("tooShort"));
    void run("generate");
  }

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      window.setTimeout(() => setCopied(null), 1800);
      capture("hook_copied", analysisId, locale, { tool: "hook_lab", category: result?.alternatives[index]?.category ?? null });
    } catch {
      /* o texto continua na tela para copiar à mão */
    }
  }

  function choose(index: number) {
    setChosen(index);
    capture("hook_selected", analysisId, locale, { tool: "hook_lab", category: result?.alternatives[index]?.category ?? null });
  }

  async function refine(index: number, request: string) {
    if (!result || refineBusy) return;
    const pedido = request.trim();
    if (pedido.length < 2) return setRefineError(t("refineEmpty"));
    setRefineBusy(true);
    setRefineError(null);
    const alternative = result.alternatives[index];
    try {
      const data = await apiFetch<{ alternative: Alternative }>("/api/tools/hook-lab/refine", {
        method: "POST",
        body: { opening: result.opening.text, context: result.context, hook: { category: alternative.category, text: alternative.text }, instruction: pedido, language: result.language, locale },
      });
      setResult({ ...result, alternatives: result.alternatives.map((item, i) => (i === index ? data.alternative : item)) });
      setRefining(null);
      setInstruction("");
      capture("hook_refined", analysisId, locale, { tool: "hook_lab", category: alternative.category });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "UNKNOWN";
      setLimited(LIMIT_CODES.has(code));
      setRefineError(describe(err));
    } finally {
      setRefineBusy(false);
    }
  }

  const picked = chosen !== null && result ? result.alternatives[chosen] : null;
  const step = !result ? 0 : picked ? 3 : 2;

  return (
    <div>
      {/* o caminho: analisar → a abertura original → as alternativas → escolher e aplicar */}
      <ol aria-label={t("stepsLabel")} className="mb-6 flex flex-wrap gap-x-5 gap-y-2">
        {(t.raw("steps") as string[]).map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined} className={cn("flex items-center gap-2 text-[13px]", index <= step ? "text-ink" : "text-ink-muted")}>
            <span className={cn("grid h-6 w-6 place-items-center rounded-full border font-mono text-[11.5px]", index < step ? "border-transparent bg-confirmed text-white" : index === step ? "border-accent text-accent" : "border-line")}>
              {index < step ? <Check size={13} strokeWidth={2.6} aria-hidden="true" /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {analysisId ? (
        // da análise: a abertura sai da transcrição, sem formulário
        !result && (
          <div className="rounded-[24px] border border-line bg-paper-raised p-6" aria-live="polite">
            {busy ? (
              <p className="flex items-center gap-3 text-[15px]">
                <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-accent" aria-hidden="true" />
                {t("loadingAnalysis")}
              </p>
            ) : (
              <Button onClick={() => void run("generate")}>{t("submit")}</Button>
            )}
          </div>
        )
      ) : (
        <form onSubmit={submit} className="rounded-[24px] border border-line bg-paper-raised p-5 sm:p-6">
          <label htmlFor="lab-opening" className="t-label">
            {t("openingLabel")}
          </label>
          <textarea
            id="lab-opening"
            value={opening}
            maxLength={OPENING_MAX}
            rows={3}
            onChange={(event) => setOpening(event.target.value)}
            placeholder={t("openingPlaceholder")}
            className="mt-3 w-full resize-y rounded-[12px] border border-line bg-paper p-3 text-[16px] leading-relaxed text-ink outline-none focus:border-[rgba(var(--accent-rgb),0.6)]"
          />
          <label htmlFor="lab-context" className="t-label mt-5 block">
            {t("contextLabel")}
          </label>
          <p id="lab-context-hint" className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            {t("contextHint")}
          </p>
          <textarea
            id="lab-context"
            aria-describedby="lab-context-hint"
            value={context}
            maxLength={CONTEXT_MAX}
            rows={4}
            onChange={(event) => setContext(event.target.value)}
            placeholder={t("contextPlaceholder")}
            className="mt-3 w-full resize-y rounded-[12px] border border-line bg-paper p-3 text-[15px] leading-relaxed text-ink outline-none focus:border-[rgba(var(--accent-rgb),0.6)]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12.5px] tabular-nums text-ink-muted">
              {opening.length}/{OPENING_MAX}
            </span>
            <Button type="submit" className="min-h-11 px-6" disabled={busy !== null} aria-busy={busy === "generate"}>
              {busy === "generate" ? t("generating") : t("submit")}
            </Button>
          </div>
          <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-muted">
            {t("noTranscript")}{" "}
            <Link href={localePath(locale, "/tools/video-audit")} className="font-medium text-ink underline underline-offset-2">
              {t("noTranscriptLink")}
            </Link>
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper-raised p-3 text-[14px] text-refuted">
          {error}
        </p>
      )}
      {limited && <ToolCta where="tool_lab_limit" tool="hook_lab" title={tTools("ctaTitle")} lead={tTools("ctaLead")} />}

      {result && (
        <section ref={results} aria-live="polite" className="mt-8 scroll-mt-24">
          {/* a abertura original e o que pode estar segurando ela */}
          <div className="rounded-[24px] border border-line bg-paper-raised p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="t-label">{t("originalTitle")}</p>
              <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-muted">{t("aiHypothesis")}</span>
            </div>
            {result.opening.start_seconds !== null && result.opening.end_seconds !== null && (
              <p className="mt-2 font-mono text-[12.5px] text-ink-muted">
                {t("originalAt", { start: formatTimestamp(result.opening.start_seconds), end: formatTimestamp(result.opening.end_seconds) })}
              </p>
            )}
            <p className="mt-3 text-[18px] font-medium leading-snug">“{result.opening.text}”</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{result.summary}</p>
            {result.audit_hook?.score !== null && result.audit_hook?.score !== undefined && (
              <p className="mt-3 text-[13.5px]">{t("auditHook", { score: result.audit_hook.score })}</p>
            )}
            {result.weaknesses.length > 0 && (
              <>
                <p className="t-label mt-6">{t("weaknessesTitle")}</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {result.weaknesses.map((weakness) => (
                    <li key={weakness} className="flex gap-3 text-[15px] leading-relaxed">
                      <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-refuted" />
                      {weakness}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* as cinco alternativas */}
          <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
            <h2 className="t-h3">{t("alternativesTitle")}</h2>
            <Button variant="secondary" onClick={() => void run("regenerate", result.alternatives.map((a) => a.text))} disabled={busy !== null} aria-busy={busy === "regenerate"}>
              <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" className={busy === "regenerate" ? "animate-spin" : undefined} />
              {busy === "regenerate" ? t("regenerating") : t("regenerate")}
            </Button>
          </div>
          <ol className="mt-5 flex flex-col gap-4">
            {result.alternatives.map((alternative, index) => {
              const isChosen = chosen === index;
              return (
                <li key={`${alternative.category}-${alternative.text}`} className={cn("rounded-[22px] border bg-paper-raised p-5 sm:p-6", isChosen ? "border-[rgba(var(--accent-rgb),0.55)] shadow-[0_0_0_4px_rgba(var(--accent-rgb),0.08)]" : "border-line")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-semibold">{t(`category.${alternative.category}`)}</span>
                    {isChosen && (
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent">
                        <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                        {t("chosen")}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[18px] font-medium leading-snug">“{alternative.text}”</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{alternative.why}</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[14px] bg-paper p-3">
                      <dt className="t-label text-[11px]">{t("onScreen")}</dt>
                      <dd className="mt-1 text-[14.5px] font-semibold">{alternative.on_screen_text}</dd>
                    </div>
                    <div className="rounded-[14px] bg-paper p-3">
                      <dt className="t-label text-[11px]">{t("delivery")}</dt>
                      <dd className="mt-1 text-[14px] leading-relaxed">{alternative.delivery}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => void copy(alternative.text, index)} aria-live="polite">
                      {copied === index ? <Check size={14} strokeWidth={2.2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
                      {copied === index ? t("copied") : t("copy")}
                    </Button>
                    <Button variant={isChosen ? "secondary" : "primary"} size="sm" onClick={() => choose(index)} aria-pressed={isChosen}>
                      {isChosen ? t("chosen") : t("use")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setRefining(refining === index ? null : index); setRefineError(null); setInstruction(""); }} aria-expanded={refining === index}>
                      <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden="true" />
                      {t("refine")}
                    </Button>
                  </div>

                  {refining === index && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void refine(index, instruction);
                      }}
                      className="mt-4 rounded-[16px] border border-line bg-paper p-4"
                    >
                      <label htmlFor={`refine-${index}`} className="text-[13.5px] font-medium">
                        {t("refineLabel")}
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {QUICK.map((key) => (
                          <button key={key} type="button" disabled={refineBusy} onClick={() => void refine(index, t(`quick.${key}`))} className="min-h-9 rounded-full border border-line px-3 text-[13px] hover:border-ink disabled:opacity-50">
                            {t(`quick.${key}`)}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          id={`refine-${index}`}
                          value={instruction}
                          maxLength={200}
                          onChange={(event) => setInstruction(event.target.value)}
                          placeholder={t("refinePlaceholder")}
                          className="min-h-11 flex-1 rounded-[12px] border border-line bg-paper-raised px-3 text-[15px] outline-none focus:border-[rgba(var(--accent-rgb),0.6)]"
                        />
                        <Button type="submit" size="sm" className="min-h-11" disabled={refineBusy} aria-busy={refineBusy}>
                          {refineBusy ? t("refining") : t("refineSubmit")}
                        </Button>
                      </div>
                      {refineError && (
                        <p role="alert" className="mt-2 text-[13px] text-refuted">
                          {refineError}
                        </p>
                      )}
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">{t("disclaimer")}</p>

          {/* escolher e aplicar: o próximo passo */}
          {picked && (
            <div className="mt-8 rounded-[24px] border border-[rgba(var(--accent-rgb),0.3)] bg-accent-soft p-6 sm:p-8">
              <p className="font-display text-[22px] font-medium tracking-[-0.01em]">{t("nextTitle")}</p>
              <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed">{t("nextLead", { onScreen: picked.on_screen_text })}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {result.source === "analysis" && analysisId && (
                  <Link href={`/results/${analysisId}`} onClick={() => upgradeClicked("hook_lab", "lab_next_analysis", { target: "full_analysis" }, analysisId)} className={buttonClasses("primary", "md", "min-h-11")}>
                    {t("nextAnalysis")}
                  </Link>
                )}
                <Link
                  href={localePath(locale, "/tools/video-audit")}
                  onClick={() => upgradeClicked("hook_lab", "lab_next_audit", { target: "video_audit" }, analysisId)}
                  className={buttonClasses(result.source === "analysis" ? "secondary" : "primary", "md", "min-h-11")}
                >
                  {result.source === "analysis" ? t("nextAuditAgain") : t("nextAudit")}
                </Link>
              </div>
            </div>
          )}

          {result.source === "transcript" && <ToolCta where="tool_lab" tool="hook_lab" title={tTools("ctaTitle")} lead={tTools("ctaLead")} />}
        </section>
      )}
    </div>
  );
}
