"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCheck, Download, Eye, Plus, Redo2, RotateCcw, Undo2, XCircle } from "lucide-react";
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
import type { SegmentPlayer } from "@/lib/useSegmentPlayer";
import type { CutSegment, SuggestedCut, EditFeedbackResponse, Recommendation, SavedDecision, VideoEdit } from "@/lib/types";

interface CutsPanelProps {
  /** Os cortes que a análise sugere, na ordem do vídeo. */
  suggested: CutSegment[];
  /** Os mesmos cortes com motivo, confiança e evidência (backends antigos não mandam). */
  suggestions?: SuggestedCut[];
  /** O que o criador já decidiu (a revisão volta como ele deixou). */
  decisions?: SavedDecision[];
  /** A edição já pedida para esta análise, se houver. */
  edit: VideoEdit | null;
  /** O plano inteiro: o texto dos cortes quando o backend não manda `suggestions`. */
  recommendations: Recommendation[];
  filename: string;
  analysisId: string;
  /** O vídeo original (link assinado): sem ele não há o que pré-visualizar. */
  videoUrl: string | null;
  /** O player do original, na coluna da página: é nele que a revisão pré-visualiza os cortes. */
  player: Omit<SegmentPlayer, "attach" | "jump">;
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
  /** A posição da sugestão, ou 60+ num corte feito à mão (é a identidade no backend). */
  key: number;
  status: SuggestionStatus;
  start: number;
  end: number;
  adjusted: boolean;
  manual: boolean;
}

const RUNNING = new Set(["pending", "processing"]);
/** Quantos passos o desfazer/refazer lembra. */
const HISTORY = 30;
/** O ajuste manda a decisão só depois que o dedo para de tocar no −/+. */
const SAVE_DELAY_MS = 500;
/** Os cortes feitos à mão usam as posições 60–99 (as sugestões nunca chegam lá). */
const MANUAL_BASE = 60;
const MANUAL_LIMIT = 100;
/** O tamanho de um corte novo, antes de o criador ajustar. */
const NEW_CUT_SECONDS = 1.5;

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
const overlaps = (a: Item, b: Item) => Math.min(a.end, b.end) - Math.max(a.start, b.start) > 0.05;
const byStart = (a: Item, b: Item) => a.start - b.start || a.key - b.key;

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
 * Backend antigo, sem `suggestions`: monta o card com o que dá — o trecho e o texto
 * do plano. Sem medida, sem confiança (nada de inventar).
 */
function fallbackSuggestions(suggested: CutSegment[], recommendations: Recommendation[]): SuggestedCut[] {
  return suggested.map((cut, index): SuggestedCut => {
    const item = recommendations.find((r) => near(r.at_seconds, cut.start_seconds) && r.end_seconds != null && near(r.end_seconds, cut.end_seconds));
    return {
      index,
      ...cut,
      reason: item?.kind === "pacing" ? "pacing" : "low_information",
      source: "ai",
      title: item?.title ?? null,
      why: item?.why ?? null,
      params: item?.params ?? {},
      // sem medida, não há confiança: o card não mostra o selo (ver `confidence` abaixo)
      confidence: "low",
      evidence: { silence_pct: 0, speech_pct: 0 },
      merged: [],
    };
  });
}

/**
 * Onde a revisão começa: as decisões guardadas; sem elas, o que o vídeo editado
 * atual já cortou (análises de antes das decisões); e o resto, sugerido.
 */
function initialItems(suggestions: SuggestedCut[], saved: SavedDecision[] | undefined, edit: VideoEdit | null): Item[] {
  const fromSuggestions: Item[] = suggestions.map((s) => {
    const decision = saved?.find((d) => d.index === s.index && !d.manual);
    if (decision) return { key: s.index, status: decision.decision, start: decision.start_seconds, end: decision.end_seconds, adjusted: decision.adjusted, manual: false };
    const alreadyCut = edit?.cuts?.some((c) => near(c.start_seconds, s.start_seconds) && near(c.end_seconds, s.end_seconds));
    return { key: s.index, status: alreadyCut ? "accepted" : "pending", start: s.start_seconds, end: s.end_seconds, adjusted: false, manual: false };
  });
  const manual: Item[] = (saved ?? [])
    .filter((d) => d.manual)
    .map((d) => ({ key: d.index, status: "accepted", start: d.start_seconds, end: d.end_seconds, adjusted: false, manual: true }));
  return [...fromSuggestions, ...manual];
}

/** Os cortes que mudaram entre duas versões da revisão (um corte à mão que sumiu vira "pendente"). */
function changedKeys(before: Item[], after: Item[]): number[] {
  const keys = new Set([...before.map((i) => i.key), ...after.map((i) => i.key)]);
  return [...keys].filter((key) => {
    const a = before.find((i) => i.key === key);
    const b = after.find((i) => i.key === key);
    return !a || !b || a.status !== b.status || a.start !== b.start || a.end !== b.end;
  });
}

/**
 * A revisão dos cortes: a IA sugere, o criador decide.
 *
 * Cada corte pode ser comparado (original → resultado), aceito, rejeitado ou
 * ajustado; o criador também cria cortes à mão, decide tudo de uma vez, desfaz e
 * refaz. Nada é cortado até ele aplicar — e então sai um vídeo NOVO, com só o que
 * ele aceitou. O original nunca muda.
 *
 * Cada decisão é guardada no backend (a revisão volta como ele deixou e as
 * preferências aprendem com ela). Se não der para guardar, a revisão segue igual.
 */
export function CutsPanel(props: CutsPanelProps) {
  const { suggested, decisions, edit, recommendations, filename, analysisId, videoUrl, player, duration, dropAt, onApply, onFeedback, onExported, errorMessage } = props;
  const t = useTranslations("Analysis.cuts");
  const tReview = useTranslations("Analysis.review");
  const tErrors = useTranslations("Errors.cuts");
  const { mode: playMode, time: playTime, playOriginal, previewCut, previewResult: playResult, seek, stop, reveal } = player;

  // o card de cada sugestão: do backend; ou, num backend antigo, montado do plano
  const suggestions = useMemo(() => props.suggestions ?? fallbackSuggestions(suggested, recommendations), [props.suggestions, suggested, recommendations]);
  const meta = useMemo(() => new Map(suggestions.map((s) => [s.index, s])), [suggestions]);

  // a tela só existe depois que as sugestões chegam: o estado inicial já é o certo
  const [items, setItems] = useState<Item[]>(() => initialItems(suggestions, decisions, edit));
  const [past, setPast] = useState<Item[][]>([]);
  const [future, setFuture] = useState<Item[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [playingKey, setPlayingKey] = useState<number | null>(null);
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
  const showReview = (suggestions.length > 0 || items.length > 0) && !running && (reopening || !edit || edit.status === "failed");
  useTrackOnce("suggestion_viewed", showReview, analysisId, { source: "list", count: suggestions.length });

  const ordered = useMemo(() => [...items].sort(byStart), [items]);
  const accepted = useMemo(() => ordered.filter((item) => item.status === "accepted"), [ordered]);
  const counts = useMemo(
    () => ({
      accepted: accepted.length,
      rejected: items.filter((item) => item.status === "rejected").length,
      pending: items.filter((item) => item.status === "pending").length,
    }),
    [items, accepted],
  );
  // o que sai de verdade: cortes aceitos que se sobrepõem contam uma vez só
  const removed = useMemo(() => {
    let total = 0;
    let cursor = -1;
    for (const item of accepted) {
      const start = Math.max(item.start, cursor);
      if (item.end > start) total += item.end - start;
      cursor = Math.max(cursor, item.end);
    }
    return total;
  }, [accepted]);
  const manualCount = items.filter((item) => item.manual).length;
  const nextManualKey = MANUAL_BASE + Math.max(-1, ...items.filter((i) => i.manual).map((i) => i.key - MANUAL_BASE)) + 1;

  function flush(): Promise<void> {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const keys = [...unsaved.current];
    unsaved.current.clear();
    if (keys.length === 0) return Promise.resolve();
    const current = latest.current;
    const body = keys.map((key) => {
      const item = current.find((i) => i.key === key);
      if (!item || item.status === "pending") return { index: key, decision: "pending" };
      const range = item.manual || (item.status === "accepted" && item.adjusted) ? { start_seconds: item.start, end_seconds: item.end } : {};
      return { index: key, decision: item.status, ...range };
    });
    return apiFetch(`/api/analyses/${analysisId}/suggestions`, { method: "PUT", body: { decisions: body } })
      .then(() => undefined)
      .catch(() => undefined); // guardar é bônus: a revisão na tela continua valendo
  }

  function persist(keys: number[], delay = 0) {
    keys.forEach((key) => unsaved.current.add(key));
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

  function change(next: Item[], delay = 0) {
    const keys = changedKeys(items, next);
    if (keys.length === 0) return;
    setPast((history) => [...history.slice(-(HISTORY - 1)), items]);
    setFuture([]);
    setItems(next);
    latest.current = next;
    persist(keys, delay);
  }

  function travel(from: Item[][], to: Item[][], setFrom: (h: Item[][]) => void, setTo: (h: Item[][]) => void) {
    const target = from[from.length - 1];
    if (!target) return;
    setFrom(from.slice(0, -1));
    setTo([...to.slice(-(HISTORY - 1)), items]);
    const keys = changedKeys(items, target);
    setItems(target);
    latest.current = target;
    persist(keys);
  }

  const kindOf = (key: number) => (key >= MANUAL_BASE ? "manual" : meta.get(key)?.reason ?? null);

  function decide(key: number, status: SuggestionStatus) {
    const item = items.find((i) => i.key === key);
    if (!item) return;
    // um corte feito à mão não tem "rejeitado": desfazê-lo é tirá-lo da lista
    const next = item.manual && status === "pending" ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, status } : i));
    change(next);
    if (status === "accepted") track("suggestion_accepted", analysisId, { index: key, reason: kindOf(key), seconds: Number((item.end - item.start).toFixed(1)), confidence: meta.get(key)?.confidence ?? null });
    if (status === "rejected") track("suggestion_rejected", analysisId, { index: key, reason: kindOf(key), confidence: meta.get(key)?.confidence ?? null });
  }

  function decideAll(status: "accepted" | "rejected") {
    const touched = items.filter((i) => !i.manual && i.status !== status);
    if (touched.length === 0) return;
    change(items.map((i) => (i.manual ? i : { ...i, status })));
    track(status === "accepted" ? "accept_all_clicked" : "reject_all_clicked", analysisId, { count: touched.length, total: suggestions.length });
  }

  function adjust(key: number, start: number, end: number) {
    const original = meta.get(key);
    const next = items.map((i) => {
      if (i.key !== key) return i;
      const adjusted = !i.manual && original !== undefined && (!near(start, original.start_seconds) || !near(end, original.end_seconds));
      // mexer no trecho é querer cortar: o ajuste já conta como aceito
      return { ...i, status: "accepted" as const, start, end, adjusted };
    });
    change(next, SAVE_DELAY_MS);
  }

  function adjustDone(key: number) {
    const item = items.find((i) => i.key === key);
    const original = meta.get(key);
    if (!item || (!item.adjusted && !item.manual)) return;
    track("suggestion_edited", analysisId, {
      index: key,
      reason: kindOf(key),
      manual: item.manual,
      start_delta: original ? Number((item.start - original.start_seconds).toFixed(2)) : null,
      end_delta: original ? Number((item.end - original.end_seconds).toFixed(2)) : null,
    });
  }

  function addManual() {
    if (nextManualKey >= MANUAL_LIMIT) return;
    const total = duration || playTime + NEW_CUT_SECONDS;
    let start = Math.max(0, Math.round(playTime * 4) / 4);
    let end = Math.min(total, start + NEW_CUT_SECONDS);
    if (end - start < 0.3) {
      end = total;
      start = Math.max(0, end - NEW_CUT_SECONDS);
    }
    const item: Item = { key: nextManualKey, status: "accepted", start, end, adjusted: false, manual: true };
    change([...items, item]);
    setSelected(item.key);
    setJustAdded(item.key);
    track("suggestion_edited", analysisId, { index: item.key, reason: "manual", manual: true, action: "added" });
  }

  function reset() {
    const fresh = initialItems(suggestions, [], null);
    change(fresh);
  }

  function select(key: number) {
    setSelected(key);
    // a linha do tempo leva até o card
    listRef.current?.querySelector<HTMLElement>(`[data-suggestion="${key}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function play(key: number, how: "original" | "cut") {
    const item = items.find((i) => i.key === key);
    if (!item) return;
    setSelected(key);
    setPlayingKey(key);
    if (how === "original") playOriginal(item.start, item.end);
    else previewCut(item.start, item.end);
    // no celular o player fica acima da lista: traz ele para a tela
    reveal();
    track("suggestion_previewed", analysisId, { index: key, mode: how === "original" ? "original" : "result", reason: kindOf(key) });
  }

  function previewAll() {
    setPlayingKey(null);
    playResult(accepted.map((item) => [item.start, item.end]));
    reveal();
    track("suggestion_previewed", analysisId, { mode: "all", accepted: accepted.length });
  }

  async function apply() {
    setApplying(true);
    stop();
    try {
      await flush();
      // cortes que se sobrepõem viram um trecho só no backend (a mesma regra que a tela avisa)
      await onApply(accepted.map((item) => ({ start_seconds: item.start, end_seconds: item.end })));
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

  /* ---------- o texto de cada card ---------- */

  function labelOf(item: Item): string {
    if (item.manual) return tReview("card.manual", { n: items.filter((i) => i.manual && i.key <= item.key).length });
    return tReview("card.suggested", { n: item.key + 1 });
  }

  function reasonOf(item: Item): string {
    if (item.manual) return tReview("reasons.manual");
    const s = meta.get(item.key);
    if (!s) return tReview("reasons.low_information");
    if (s.title) return s.why ? `${s.title}. ${s.why}` : s.title;
    const params = s.params ?? {};
    if (s.reason === "hesitation") return tReview("reasons.hesitation", { text: String(params.text ?? "") });
    if (s.reason === "repetition") return tReview("reasons.repetition");
    return tReview(`reasons.${s.reason}` as "reasons.long_pause", { seconds: Number(params.seconds ?? (s.end_seconds - s.start_seconds).toFixed(1)) });
  }

  function evidenceOf(item: Item): string | null {
    const s = meta.get(item.key);
    if (item.manual || !s || !props.suggestions) return null;
    const similarity = Number(s.params?.similarity ?? 0);
    if ((s.reason === "repetition" || s.merged.includes("repetition")) && similarity) return tReview("evidence.similarity", { pct: similarity });
    if (s.evidence.silence_pct >= 30) return tReview("evidence.silence", { pct: s.evidence.silence_pct });
    if (s.reason === "hesitation") return tReview("evidence.hesitation");
    if (s.evidence.speech_pct > 0) return tReview("evidence.speech", { pct: s.evidence.speech_pct });
    return tReview("evidence.ai");
  }

  function mergedOf(item: Item): string | null {
    const s = meta.get(item.key);
    if (!s || s.merged.length === 0) return null;
    return tReview("merged", { list: s.merged.map((reason) => tReview(`reasonLabel.${reason}` as "reasonLabel.long_pause")).join(", ") });
  }

  function overlapOf(item: Item): string | null {
    if (item.status !== "accepted") return null;
    const other = accepted.find((o) => o.key !== item.key && overlaps(o, item));
    return other ? tReview("overlap", { label: labelOf(other) }) : null;
  }

  // nada parado o bastante para cortar: dizer isso também é resposta
  if (suggestions.length === 0 && !edit && items.length === 0) {
    return (
      <section id="revisar" className="scroll-mt-20 rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
        <p className="t-label tracking-[0.08em]">{t("label")}</p>
        <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-muted">{t("none")}</p>
      </section>
    );
  }

  const playingMode = playMode === "original" || playMode === "cut" ? playMode : null;
  const timelineSelected = selected === null ? null : ordered.findIndex((i) => i.key === selected);
  const finalLength = Math.max(0, duration - removed);

  return (
    <section id="revisar" className="scroll-mt-20 rounded-[24px] border-2 border-ink bg-paper-raised shadow-[6px_6px_0_var(--ink)]">
      {/* ---------- cabeçalho: quantos cortes e a regra (nada sai sem o ok) ---------- */}
      <div className="border-b border-line px-5 py-4 sm:px-6 sm:py-5">
        <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.03em] sm:text-[24px]">
          {showReview ? (edit?.status === "completed" ? tReview("titleAgain") : tReview("title", { count: suggestions.length })) : t("title")}
        </h2>
        <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">{showReview ? tReview("lead") : t("lead")}</p>
      </div>

      {showReview && (
        <>
          {/* ---------- a linha do tempo e o tamanho final, com a prévia do vídeo inteiro ---------- */}
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <SuggestionTimeline
              duration={duration}
              items={ordered.map((item) => ({ start: item.start, end: item.end, status: item.status, edited: item.adjusted || item.manual }))}
              selected={timelineSelected !== null && timelineSelected >= 0 ? timelineSelected : null}
              playhead={playTime}
              dropAt={dropAt}
              onSelect={(position) => select(ordered[position].key)}
              onSeek={seek}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="mr-auto text-[13px] tabular-nums text-ink-muted">
                {tReview("compare.original")} <span className="font-semibold text-ink">{formatTimestamp(duration)}</span>
                <span aria-hidden="true"> → </span>
                {tReview("compare.result")} <span className="font-semibold text-accent">{formatTimestamp(finalLength)}</span>
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="min-h-9"
                onClick={previewAll}
                disabled={!videoUrl || accepted.length === 0}
                title={accepted.length === 0 ? tReview("previewResultEmpty") : tReview("previewResultHint")}
              >
                <Eye size={15} strokeWidth={2} aria-hidden="true" />
                {tReview("previewResult")}
              </Button>
              <Button variant="ghost" size="sm" className="min-h-9" onClick={addManual} disabled={!videoUrl || nextManualKey >= MANUAL_LIMIT}>
                <Plus size={15} strokeWidth={2} aria-hidden="true" />
                {tReview("addCut", { time: formatTimestamp(playTime) })}
              </Button>
            </div>
          </div>

          {/* ---------- as sugestões ---------- */}
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <p className="mr-auto basis-full text-[13px] text-ink-muted sm:basis-auto" aria-live="polite">
                {tReview("counts", counts)}
                {manualCount > 0 && ` · ${tReview("manualCount", { count: manualCount })}`}
              </p>
              <Button variant="ghost" size="sm" className="min-h-9 !px-2 sm:!px-2.5" onClick={() => decideAll("accepted")} disabled={items.every((i) => i.manual || i.status === "accepted")}>
                <CheckCheck size={15} strokeWidth={2} aria-hidden="true" className="hidden sm:block" />
                {tReview("bulk.acceptAll")}
              </Button>
              <Button variant="ghost" size="sm" className="min-h-9 !px-2 sm:!px-2.5" onClick={() => decideAll("rejected")} disabled={items.every((i) => i.manual || i.status === "rejected")}>
                <XCircle size={15} strokeWidth={2} aria-hidden="true" className="hidden sm:block" />
                {tReview("bulk.rejectAll")}
              </Button>
              <span className="flex">
              <Button variant="ghost" size="sm" className="min-h-9 !px-2" onClick={() => travel(past, future, setPast, setFuture)} disabled={past.length === 0} aria-label={tReview("bulk.undo")} title={tReview("bulk.undo")}>
                <Undo2 size={15} strokeWidth={2} aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" className="min-h-9 !px-2" onClick={() => travel(future, past, setFuture, setPast)} disabled={future.length === 0} aria-label={tReview("bulk.redo")} title={tReview("bulk.redo")}>
                <Redo2 size={15} strokeWidth={2} aria-hidden="true" />
              </Button>
              </span>
            </div>

            <ul ref={listRef} className="flex flex-col gap-2.5">
              {ordered.map((item) => {
                const s = meta.get(item.key);
                return (
                  <SuggestionCard
                    key={item.key}
                    anchor={item.key}
                    label={labelOf(item)}
                    status={item.status}
                    edited={item.adjusted || item.manual}
                    manual={item.manual}
                    start={item.start}
                    end={item.end}
                    original={s ? { start: s.start_seconds, end: s.end_seconds } : null}
                    duration={duration}
                    reason={reasonOf(item)}
                    confidence={item.manual || !props.suggestions ? null : (s?.confidence ?? null)}
                    evidence={evidenceOf(item)}
                    merged={mergedOf(item)}
                    overlap={overlapOf(item)}
                    selected={selected === item.key}
                    playing={playingKey === item.key ? playingMode : null}
                    startAdjusting={justAdded === item.key}
                    onSelect={() => setSelected(item.key)}
                    onPlayOriginal={() => play(item.key, "original")}
                    onPlayResult={() => play(item.key, "cut")}
                    onDecide={(status) => decide(item.key, status)}
                    onAdjust={(start, end) => adjust(item.key, start, end)}
                    onAdjustDone={() => adjustDone(item.key)}
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

          {/* ---------- aplicar: só o que foi aceito, num vídeo novo ---------- */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-paper-raised px-5 py-3.5 sm:px-6">
            <p className="text-[13.5px] leading-snug text-ink-muted">
              {counts.accepted === 0
                ? tReview("apply.none")
                : tReview("apply.summary", { count: counts.accepted, seconds: Number(removed.toFixed(1)), to: formatTimestamp(finalLength) })}
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
        <div className="m-5 flex items-center gap-3 rounded-xl border border-line bg-paper p-4 sm:m-6" aria-live="polite" aria-busy="true">
          <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-accent" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium">{edit?.source === "revision" ? t("processingRevision") : t("processing")}</p>
            {edit?.source === "revision" && edit.instruction && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">&ldquo;{edit.instruction}&rdquo;</p>}
          </div>
        </div>
      )}

      {edit?.status === "failed" && (
        <p role="alert" className={cn("rounded-xl border border-refuted bg-paper p-3 text-[13.5px] text-refuted", showReview ? "mx-5 mb-5 sm:mx-6" : "m-5 sm:m-6")}>
          {edit.error_code && tErrors.has(edit.error_code as "generic") ? tErrors(edit.error_code as "generic") : tErrors("generic")}
        </p>
      )}

      {edit?.status === "completed" && !showReview && (
        <div className="grid items-start gap-6 p-5 sm:grid-cols-[minmax(0,200px)_1fr] sm:p-6">
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
              <button type="button" onClick={() => setReopening(true)} className="text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                {t("again")}
              </button>
            </div>
            <EditFeedback key={edit.revision} edit={edit} onSubmit={onFeedback} />
          </div>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="mx-5 mb-5 rounded-xl border border-refuted bg-paper p-3 text-[13.5px] text-refuted sm:mx-6">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
