"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCheck, Download, Eye, RotateCcw, ShieldCheck, Sparkles, Undo2, XCircle } from "lucide-react";
import { useRecommendationText } from "@/components/ActionPlan";
import { EditFeedback } from "@/components/EditFeedback";
import { ShareVideoButton } from "@/components/ShareVideoButton";
import { SuggestionCard } from "@/components/SuggestionCard";
import { SuggestionTimeline, type SuggestionStatus } from "@/components/SuggestionTimeline";
import { Button } from "@/components/ui/Button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { track, useTrackOnce } from "@/lib/events";
import { formatTimestamp } from "@/lib/format";
import { useSegmentPlayer } from "@/lib/useSegmentPlayer";
import type { CutSegment, EditFeedbackResponse, Recommendation, SavedDecision, VideoEdit } from "@/lib/types";

interface CutsPanelProps {
  /** Os cortes que a análise sugere, na ordem do vídeo. */
  suggested: CutSegment[];
  /** O que o criador já decidiu sobre cada sugestão (a revisão volta como ele deixou). */
  decisions?: SavedDecision[];
  /** A edição já pedida para esta análise, se houver. */
  edit: VideoEdit | null;
  /** O plano inteiro: é dele que sai o motivo de cada corte. */
  recommendations: Recommendation[];
  filename: string;
  analysisId: string;
  /** O vídeo original (link assinado): é nele que a revisão pré-visualiza os cortes. */
  videoUrl: string | null;
  duration: number;
  /** O segundo da queda de retenção, marcado na linha do tempo. */
  dropAt?: number | null;
  onApply: (cuts: CutSegment[]) => Promise<void>;
  /** "Gostou do vídeo editado?" — e, se não, o que a pessoa mudaria. */
  onFeedback: (rating: "liked" | "disliked", note: string | null) => Promise<EditFeedbackResponse>;
  /** Baixou ou compartilhou o vídeo editado: o último passo do fluxo. */
  onExported?: () => void;
  errorMessage?: string | null;
}

interface Item {
  status: SuggestionStatus;
  start: number;
  end: number;
  adjusted: boolean;
}

const RUNNING = new Set(["pending", "processing"]);
/** Quantos passos o "desfazer" lembra. */
const HISTORY = 30;
/** O ajuste manda uma decisão só depois que o dedo para de tocar no −/+. */
const SAVE_DELAY_MS = 500;

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;

/** O mesmo trecho no plano: o título e o porquê que o criador já leu lá em cima. */
function explain(cut: CutSegment, recommendations: Recommendation[]): Recommendation | undefined {
  return recommendations.find((item) => near(item.at_seconds, cut.start_seconds) && item.end_seconds != null && near(item.end_seconds, cut.end_seconds));
}

/** O nome do vídeo editado, ao baixar ou compartilhar: o do original, marcado. */
function editedName(filename: string): string {
  return (filename.replace(/\.[^.]+$/, "") || "video") + "-publishub.mp4";
}

/** O link com o pedido para o Storage entregar como download. */
function downloadHref(url: string, filename: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("download", editedName(filename));
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Onde a revisão começa: as decisões guardadas; sem elas, o que o vídeo editado
 * atual já cortou (análises de antes das decisões); e o resto, pendente.
 */
function initialItems(suggested: CutSegment[], saved: SavedDecision[] | undefined, edit: VideoEdit | null): Item[] {
  return suggested.map((cut, index) => {
    const decision = saved?.find((d) => d.index === index);
    if (decision) return { status: decision.decision, start: decision.start_seconds, end: decision.end_seconds, adjusted: decision.adjusted };
    const alreadyCut = edit?.cuts?.some((c) => near(c.start_seconds, cut.start_seconds) && near(c.end_seconds, cut.end_seconds));
    return { status: alreadyCut ? "accepted" : "pending", start: cut.start_seconds, end: cut.end_seconds, adjusted: false };
  });
}

/**
 * A revisão dos cortes: a IA sugere, o criador decide.
 *
 * Cada trecho sugerido pode ser visto, pré-visualizado (o player pula o trecho),
 * aceito, rejeitado ou ajustado; dá para decidir tudo de uma vez e desfazer. Nada
 * é cortado até o criador aplicar — e então sai um vídeo NOVO, com só o que ele
 * aceitou. O original nunca muda.
 *
 * Cada decisão é guardada no backend (a revisão volta como ele deixou e as
 * preferências aprendem com ela). Se não der para guardar, a revisão segue igual.
 */
export function CutsPanel(props: CutsPanelProps) {
  const { suggested, decisions, edit, recommendations, filename, analysisId, videoUrl, duration, dropAt, onApply, onFeedback, onExported, errorMessage } = props;
  const t = useTranslations("Analysis.cuts");
  const tReview = useTranslations("Analysis.review");
  const tErrors = useTranslations("Errors.cuts");
  const recommendationText = useRecommendationText();
  const { attach, mode: playMode, time: playTime, playSegment, previewCut, previewResult: playResult, seek, stop, reveal } = useSegmentPlayer();

  // a tela só existe depois que as sugestões chegam: o estado inicial já é o certo
  const [items, setItems] = useState<Item[]>(() => initialItems(suggested, decisions, edit));
  const [history, setHistory] = useState<Item[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  // depois de uma edição pronta, revisar de novo é um passo explícito
  const [reopening, setReopening] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // decisões esperando para ir ao backend: juntadas, para o −/+ não virar dez requisições
  const unsaved = useRef<Set<number>>(new Set());
  const saveTimer = useRef<number | null>(null);
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  }, [items]);

  const running = Boolean(edit && RUNNING.has(edit.status));
  const showReview = suggested.length > 0 && !running && (reopening || !edit || edit.status === "failed");
  useTrackOnce("suggestion_viewed", showReview, analysisId, { source: "list", count: suggested.length });

  const accepted = useMemo(() => items.map((item, index) => ({ ...item, index })).filter((item) => item.status === "accepted"), [items]);
  const counts = useMemo(
    () => ({
      accepted: accepted.length,
      rejected: items.filter((item) => item.status === "rejected").length,
      pending: items.filter((item) => item.status === "pending").length,
    }),
    [items, accepted],
  );
  const removed = accepted.reduce((total, item) => total + (item.end - item.start), 0);

  function flush(): Promise<void> {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const indices = [...unsaved.current];
    unsaved.current.clear();
    if (indices.length === 0) return Promise.resolve();
    const current = latest.current;
    const body = indices.map((index) => {
      const item = current[index];
      const range = item.status === "accepted" && item.adjusted ? { start_seconds: item.start, end_seconds: item.end } : {};
      return { index, decision: item.status, ...range };
    });
    return apiFetch(`/api/analyses/${analysisId}/suggestions`, { method: "PUT", body: { decisions: body } })
      .then(() => undefined)
      .catch(() => undefined); // guardar é bônus: a revisão na tela continua valendo
  }

  function persist(indices: number[], delay = 0) {
    indices.forEach((index) => unsaved.current.add(index));
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), delay);
  }

  // saiu da página no meio de um ajuste: manda o que falta
  useEffect(
    () => () => {
      void flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function change(next: Item[], changed: number[], delay = 0) {
    setHistory((past) => [...past.slice(-(HISTORY - 1)), items]);
    setItems(next);
    latest.current = next;
    persist(changed, delay);
  }

  function decide(index: number, status: SuggestionStatus) {
    const next = items.map((item, i) => (i === index ? { ...item, status } : item));
    change(next, [index]);
    const kind = explain(suggested[index], recommendations)?.kind ?? null;
    if (status === "accepted") track("suggestion_accepted", analysisId, { index, kind, seconds: Number((items[index].end - items[index].start).toFixed(1)), bulk: false });
    if (status === "rejected") track("suggestion_rejected", analysisId, { index, kind, bulk: false });
  }

  function decideAll(status: "accepted" | "rejected") {
    const changed = items.map((item, index) => (item.status !== status ? index : -1)).filter((index) => index >= 0);
    if (changed.length === 0) return;
    change(items.map((item) => ({ ...item, status })), changed);
    track(status === "accepted" ? "suggestion_accepted" : "suggestion_rejected", analysisId, { bulk: true, count: changed.length });
  }

  function adjust(index: number, start: number, end: number) {
    const original = suggested[index];
    const adjusted = !near(start, original.start_seconds) || !near(end, original.end_seconds);
    // mexer no trecho é querer cortar: o ajuste já conta como aceito
    const next = items.map((item, i) => (i === index ? { status: "accepted" as const, start, end, adjusted } : item));
    change(next, [index], SAVE_DELAY_MS);
  }

  function adjustDone(index: number) {
    const item = items[index];
    const original = suggested[index];
    if (!item.adjusted) return;
    track("suggestion_edited", analysisId, {
      index,
      kind: explain(original, recommendations)?.kind ?? null,
      start_delta: Number((item.start - original.start_seconds).toFixed(2)),
      end_delta: Number((item.end - original.end_seconds).toFixed(2)),
    });
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    const changed = previous.map((item, index) => (item.status !== items[index].status || item.start !== items[index].start || item.end !== items[index].end ? index : -1)).filter((index) => index >= 0);
    setHistory((past) => past.slice(0, -1));
    setItems(previous);
    latest.current = previous;
    persist(changed);
  }

  function reset() {
    const fresh = suggested.map((cut) => ({ status: "pending" as const, start: cut.start_seconds, end: cut.end_seconds, adjusted: false }));
    const changed = items.map((item, index) => (item.status !== "pending" || item.adjusted ? index : -1)).filter((index) => index >= 0);
    if (changed.length) change(fresh, changed);
  }

  function select(index: number) {
    setSelected(index);
    // a linha do tempo leva até o cartão; o cartão, até o trecho
    listRef.current?.querySelector<HTMLElement>(`[data-suggestion="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function play(index: number, how: "segment" | "cut") {
    const item = items[index];
    setSelected(index);
    setPlayingIndex(index);
    if (how === "segment") playSegment(item.start, item.end);
    else previewCut(item.start, item.end);
    // no celular o player fica acima da lista: traz ele para a tela
    reveal();
    track("suggestion_viewed", analysisId, { source: how === "segment" ? "segment" : "preview", index });
  }

  function previewResult() {
    setPlayingIndex(null);
    playResult(accepted.map((item) => [item.start, item.end]));
    reveal();
    track("suggestion_viewed", analysisId, { source: "result_preview", accepted: accepted.length });
  }

  async function apply() {
    setApplying(true);
    stop();
    try {
      await flush();
      await onApply([...accepted].sort((a, b) => a.start - b.start).map((item) => ({ start_seconds: item.start, end_seconds: item.end })));
      setReopening(false);
    } catch {
      // a mensagem vem por errorMessage; a revisão continua como estava
    } finally {
      setApplying(false);
    }
  }

  function exported(method: "download" | "share") {
    track("video_exported", analysisId, { method, revision: edit?.revision ?? 1 });
    onExported?.();
  }

  // nada parado o bastante para cortar: dizer isso também é resposta
  if (suggested.length === 0 && !edit) {
    return (
      <section id="revisar" className="mt-12 rounded-2xl border border-line bg-paper-raised p-5 sm:p-7">
        <p className="t-label tracking-[0.08em]">{t("label")}</p>
        <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-muted">{t("none")}</p>
      </section>
    );
  }

  const playingMode = playMode === "segment" || playMode === "cut" ? playMode : null;

  return (
    <section id="revisar" className="mt-12 scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-card">
      {/* ---------- cabeçalho: a promessa do copiloto, dita onde ela acontece ---------- */}
      <div className="border-b border-line p-5 sm:p-7">
        <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-accent">
          <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
          {tReview("eyebrow")}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] sm:text-[26px]">
              {showReview ? (edit?.status === "completed" ? tReview("titleAgain") : tReview("title", { count: suggested.length })) : t("title")}
            </h2>
            <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{showReview ? tReview("lead") : t("lead")}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] font-medium text-ink-muted">
            <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" className="text-accent" />
            {t("safe")}
          </span>
        </div>
      </div>

      {showReview && (
        <>
          {/* ---------- a linha do tempo: o vídeo inteiro, cada corte no lugar dele ---------- */}
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <SuggestionTimeline
              duration={duration}
              items={items}
              selected={selected}
              playhead={playTime}
              dropAt={dropAt}
              onSelect={select}
              onSeek={seek}
            />
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
            {/* ---------- o player da revisão: o original, pulando o que foi aceito ---------- */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="mx-auto w-full max-w-[240px] lg:max-w-none">
                <div className="relative overflow-hidden rounded-xl border border-line bg-ink">
                  {videoUrl ? (
                    <video ref={attach} src={videoUrl} controls playsInline preload="metadata" className="block max-h-[56vh] w-full bg-ink" />
                  ) : (
                    <div className="flex aspect-[9/16] w-full items-center justify-center p-6 text-center text-sm text-paper-raised">{t("noPreview")}</div>
                  )}
                  {playMode !== "idle" && (
                    <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(var(--accent-rgb),0.92)] px-2.5 py-1 text-[11.5px] font-semibold text-paper-raised">
                      <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper-raised" />
                      {tReview(`playing.${playMode}`)}
                    </span>
                  )}
                </div>
                <Button variant="secondary" size="sm" className="mt-3 min-h-10 w-full" onClick={previewResult} disabled={!videoUrl || accepted.length === 0}>
                  <Eye size={15} strokeWidth={2} aria-hidden="true" />
                  {tReview("previewResult")}
                </Button>
                <p className="mt-2 text-center text-[12px] leading-relaxed text-ink-muted">{accepted.length === 0 ? tReview("previewResultEmpty") : tReview("previewResultHint")}</p>
              </div>
            </div>

            {/* ---------- as sugestões ---------- */}
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-[13px] text-ink-muted" aria-live="polite">
                  {tReview("counts", counts)}
                </p>
                <Button variant="ghost" size="sm" className="min-h-9" onClick={() => decideAll("accepted")} disabled={counts.accepted === items.length}>
                  <CheckCheck size={15} strokeWidth={2} aria-hidden="true" />
                  {tReview("bulk.acceptAll")}
                </Button>
                <Button variant="ghost" size="sm" className="min-h-9" onClick={() => decideAll("rejected")} disabled={counts.rejected === items.length}>
                  <XCircle size={15} strokeWidth={2} aria-hidden="true" />
                  {tReview("bulk.rejectAll")}
                </Button>
                <Button variant="ghost" size="sm" className="min-h-9" onClick={undo} disabled={history.length === 0}>
                  <Undo2 size={15} strokeWidth={2} aria-hidden="true" />
                  {tReview("bulk.undo")}
                </Button>
              </div>

              <ul ref={listRef} className="flex flex-col gap-3">
                {items.map((item, index) => {
                  const recommendation = explain(suggested[index], recommendations);
                  const text = recommendation ? recommendationText(recommendation) : null;
                  return (
                      <SuggestionCard
                        key={index}
                        index={index}
                        status={item.status}
                        start={item.start}
                        end={item.end}
                        original={{ start: suggested[index].start_seconds, end: suggested[index].end_seconds }}
                        adjusted={item.adjusted}
                        duration={duration}
                        kind={recommendation?.kind ?? null}
                        title={text?.title ?? null}
                        why={text?.why ?? text?.action ?? null}
                        selected={selected === index}
                        playing={playingIndex === index ? playingMode : null}
                        onSelect={() => setSelected(index)}
                        onPlaySegment={() => play(index, "segment")}
                        onPreviewCut={() => play(index, "cut")}
                        onDecide={(status) => decide(index, status)}
                        onAdjust={(start, end) => adjust(index, start, end)}
                        onAdjustDone={() => adjustDone(index)}
                      />
                  );
                })}
              </ul>

              {(counts.accepted > 0 || counts.rejected > 0) && (
                <button type="button" onClick={reset} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                  <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
                  {tReview("bulk.reset")}
                </button>
              )}
            </div>
          </div>

          {/* ---------- aplicar: só o que foi aceito, num vídeo novo ---------- */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper-raised px-5 py-4 sm:px-7">
            <p className="text-[13.5px] leading-snug text-ink-muted">
              {counts.accepted === 0
                ? tReview("apply.none")
                : tReview("apply.summary", { count: counts.accepted, seconds: Number(removed.toFixed(1)), to: formatTimestamp(Math.max(0, duration - removed)) })}
            </p>
            <Button className="min-h-11 w-full sm:w-auto" onClick={apply} disabled={applying || counts.accepted === 0}>
              {applying
                ? t("applying")
                : counts.accepted === 0
                  ? tReview("apply.ctaIdle")
                  : edit?.status === "completed"
                    ? tReview("apply.again", { count: counts.accepted })
                    : tReview("apply.cta", { count: counts.accepted })}
            </Button>
          </div>
        </>
      )}

      {running && (
        <div className="m-5 flex items-center gap-3 rounded-xl border border-line bg-paper p-4 sm:m-7" aria-live="polite" aria-busy="true">
          <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-accent" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium">{edit?.source === "revision" ? t("processingRevision") : t("processing")}</p>
            {edit?.source === "revision" && edit.instruction && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">&ldquo;{edit.instruction}&rdquo;</p>}
          </div>
        </div>
      )}

      {edit?.status === "failed" && (
        <p role="alert" className={cn("rounded-xl border border-refuted bg-paper p-3 text-[13.5px] text-refuted", showReview ? "mx-5 mb-5 sm:mx-7" : "m-5 sm:m-7")}>
          {edit.error_code && tErrors.has(edit.error_code as "generic") ? tErrors(edit.error_code as "generic") : tErrors("generic")}
        </p>
      )}

      {edit?.status === "completed" && !showReview && (
        <div className="grid items-start gap-7 p-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:p-7">
          <VideoPlayer src={edit.download_url} fallback={t("noPreview")} />
          <div>
            <p className="t-label">{edit.revision > 1 ? t("ready.versionLabel", { version: edit.revision }) : t("ready.label")}</p>
            <p className="mt-2 font-display text-[20px] font-semibold leading-snug tracking-[-0.01em]">
              {t("ready.title", {
                removed: Number((edit.removed_seconds ?? 0).toFixed(1)),
                from: formatTimestamp(edit.original_duration_seconds ?? 0),
                to: formatTimestamp(edit.duration_seconds ?? 0),
              })}
            </p>
            {edit.source === "revision" && edit.reply && !edit.feedback ? (
              <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed">
                <span className="font-medium">{t("ready.changed")}</span> <span className="text-ink-muted">{edit.reply}</span>
              </p>
            ) : (
              <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-muted">{t("ready.lead")}</p>
            )}
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] tabular-nums text-ink-muted">
              {(edit.kept ?? []).map((piece) => (
                <li key={`${piece.start_seconds}-${piece.end_seconds}`}>
                  {formatTimestamp(piece.start_seconds)} → {formatTimestamp(piece.end_seconds)}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {/* compartilhar primeiro: no celular, o vídeo vai direto para o Instagram, o TikTok ou o WhatsApp */}
              {edit.download_url && (
                <ShareVideoButton url={edit.download_url} fileName={editedName(filename)} analysisId={analysisId} revision={edit.revision} onShared={() => exported("share")} />
              )}
              {edit.download_url && (
                <a
                  href={downloadHref(edit.download_url, filename)}
                  download
                  onClick={() => exported("download")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-paper-raised px-4 text-[14px] font-semibold text-ink shadow-float hover:no-underline hover:border-[rgba(var(--ink-rgb),0.22)]"
                >
                  <Download size={15} strokeWidth={1.75} aria-hidden="true" />
                  {t("download")}
                </a>
              )}
              {suggested.length > 0 && (
                <button type="button" onClick={() => setReopening(true)} className="text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                  {t("again")}
                </button>
              )}
            </div>
            <EditFeedback key={edit.revision} edit={edit} onSubmit={onFeedback} />
          </div>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="mx-5 mb-5 rounded-xl border border-refuted bg-paper p-3 text-[13.5px] text-refuted sm:mx-7">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
