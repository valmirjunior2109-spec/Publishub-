"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { CopyPlanButton, planAsMarkdown } from "@/components/ActionPlan";
import { BlindPrediction } from "@/components/BlindPrediction";
import { CopilotPanel } from "@/components/CopilotPanel";
import { CutsPanel } from "@/components/CutsPanel";
import { GuestShell } from "@/components/GuestShell";
import { LockedPlan } from "@/components/LockedPlan";
import { LockedRewrites } from "@/components/LockedRewrites";
import { MainInsight } from "@/components/MainInsight";
import { NextStep } from "@/components/NextStep";
import { NotionSend } from "@/components/NotionSend";
import { PredictionLoop } from "@/components/PredictionLoop";
import { ProcessingSteps } from "@/components/ProcessingSteps";
import { RequireAuth } from "@/components/RequireAuth";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { RepublishPlan } from "@/components/RepublishPlan";
import { RewriteCard } from "@/components/RewriteCard";
import { AppShell } from "@/components/AppShell";
import { AnalysisStatusBadge, OutcomeBadge } from "@/components/StatusBadge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { apiFetch, ApiError } from "@/lib/api";
import { formatTimestamp, isActive, languageName } from "@/lib/format";
import { track, useTrackOnce } from "@/lib/events";
import { readGuestToken } from "@/lib/guest";
import { useSession } from "@/lib/session";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import { useErrorText } from "@/lib/useErrorText";
import { usePolling } from "@/lib/usePolling";
import { useSegmentPlayer } from "@/lib/useSegmentPlayer";
import type { Accuracy, Analysis, BlindResponse, CutSegment, EditFeedbackResponse, EditResponse, Followup, OutcomeResponse } from "@/lib/types";

const stillProcessing = (analysis: Analysis) => isActive(analysis.status);
const editRunning = (data: EditResponse) => data.edit?.status === "pending" || data.edit?.status === "processing";

/* Falhas em que tentar de novo com o mesmo arquivo dá no mesmo: o caminho é
   mandar outro vídeo (ou outro print). O resto é do nosso lado e vale retry. */
const NEEDS_ANOTHER_FILE = new Set(["no_speech", "no_audio", "invalid_video", "video_too_long"]);

/* O token de convidado vem do localStorage, que não existe no servidor: com
   useSyncExternalStore o servidor renderiza "sem token" e o navegador corrige
   depois da hidratação, sem effect e sem divergência de HTML. */
const noSubscription = () => () => {};
const noTokenOnServer = () => null;

/** `guest`: sem conta, vendo a previsão cega. A análise completa fica atrás do cadastro. */
function AnalysisView({ id, guest = false }: { id: string; guest?: boolean }) {
  const t = useTranslations("Analysis");
  const tReview = useTranslations("Analysis.review");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("Errors");
  const format = useFormatter();
  const handleApiError = useApiErrorHandler();
  // o único player da página: o diagnóstico, o plano e a revisão dos cortes tocam o original nele
  // `attach` vai para o <video>; o resto (tocar, pular, o modo) vai para quem controla
  const { attach: attachPlayer, jump, ...player } = useSegmentPlayer();

  const router = useRouter();
  // convidado não tem sessão para expirar: um 401 aqui é o token velho, não login vencido
  const { data: analysis, error: loadError, reload } = usePolling<Analysis>(`/api/analyses/${id}`, { shouldPoll: stillProcessing, redirectWhenExpired: !guest });
  const { data: accuracyData, reload: reloadAccuracy } = usePolling<Accuracy>("/api/accuracy", { shouldPoll: () => false, enabled: !guest });
  const { data: followupData, reload: reloadFollowup } = usePolling<{ followup: Followup | null }>(`/api/analyses/${id}/followup`, { shouldPoll: () => false, enabled: !guest });
  // os cortes sugeridos (e o vídeo editado, se o criador já aceitou): só depois da
  // análise pronta; enquanto o vídeo aceito está sendo gerado, continua consultando
  const { data: editData, reload: reloadEdit } = usePolling<EditResponse>(`/api/analyses/${id}/edit`, { shouldPoll: editRunning, enabled: !guest && analysis?.status === "completed" });
  const [followup, setFollowup] = useState<Followup | null>(null);
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Each poll returns a freshly signed URL; keep the first one so the player doesn't reload.
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  if (!playbackUrl && analysis?.video.playback_url) setPlaybackUrl(analysis.video.playback_url);
  const [insightsUrl, setInsightsUrl] = useState<string | null>(null);
  if (!insightsUrl && analysis?.video.insights_url) setInsightsUrl(analysis.video.insights_url);

  // os eventos do funil: uma vez por tela, não a cada poll
  useTrackOnce("results_viewed", Boolean(analysis), id, { status: analysis?.status ?? "", guest });
  useTrackOnce("prediction_shown", Boolean(analysis?.blind), id);
  useTrackOnce("full_analysis_viewed", !guest && analysis?.status === "completed" && Boolean(analysis?.result), id, { locked: Boolean(analysis?.locked) });
  useTrackOnce("paywall_viewed", Boolean(analysis?.locked), id, { where: "results", guest });

  const describe = useErrorText();
  const tFail = useTranslations("Errors.analysis");
  const locale = useLocale();

  async function retry() {
    setRetrying(true);
    setActionError(null);
    try {
      await apiFetch(`/api/analyses/${id}/retry`, { method: "POST", body: { ui_locale: locale } });
      reload();
    } catch (err) {
      if (!(await handleApiError(err as ApiError))) setActionError(describe(err));
    }
    setRetrying(false);
  }

  async function record(actual: number) {
    setActionError(null);
    try {
      const response = await apiFetch<OutcomeResponse>(`/api/analyses/${id}/outcome`, { method: "POST", body: { actual_retention: actual } });
      setAccuracy(response.accuracy);
      track("real_result_submitted", id, { actual });
      reload();
      reloadAccuracy();
      reloadFollowup();
    } catch (err) {
      if (!(await handleApiError(err as ApiError))) setActionError(describe(err));
      throw err;
    }
  }

  async function respondBlind(response: "hit" | "miss", actualSeconds: number | null) {
    setActionError(null);
    try {
      await apiFetch<BlindResponse>(`/api/analyses/${id}/blind`, { method: "POST", body: { response, actual_seconds: actualSeconds } });
      track("prediction_confirmed", id, { response });
      reload();
      if (!guest) reloadAccuracy();
    } catch (err) {
      setActionError(describe(err));
      throw err;
    }
  }

  async function scheduleFollowup(republishOn: string | null) {
    setActionError(null);
    try {
      const response = await apiFetch<{ followup: Followup }>(`/api/analyses/${id}/followup`, { method: "POST", body: { republish_on: republishOn, ui_locale: locale } });
      setFollowup(response.followup);
      reloadFollowup();
    } catch (err) {
      setActionError(describe(err));
      throw err;
    }
  }

  /** O criador aceitou os cortes: só aqui o backend gera o vídeo editado. */
  async function applyCuts(cuts: CutSegment[]) {
    setActionError(null);
    try {
      await apiFetch<{ edit: unknown }>(`/api/analyses/${id}/edit`, { method: "POST", body: { cuts } });
      reloadEdit();
    } catch (err) {
      if (!(await handleApiError(err as ApiError))) setActionError(describe(err));
      throw err;
    }
  }

  /** "Gostou do vídeo editado?" — se não, o que a pessoa escreveu vira a próxima versão. */
  async function sendEditFeedback(rating: "liked" | "disliked", note: string | null): Promise<EditFeedbackResponse> {
    setActionError(null);
    try {
      const response = await apiFetch<EditFeedbackResponse>(`/api/analyses/${id}/edit/feedback`, { method: "POST", body: { rating, note, ui_locale: locale } });
      reloadEdit();
      return response;
    } catch (err) {
      if (!(await handleApiError(err as ApiError))) setActionError(describe(err));
      throw err;
    }
  }

  /** "Enviar print para análise completa": com conta, o upload; sem conta, o cadastro. */
  function sendScreenshot() {
    router.push(guest ? "/signup" : "/nova-analise");
  }

  if (loadError?.status === 404) {
    return (
      <main className="mx-auto max-w-page px-5 py-16 lg:px-16">
        <p className="rounded-sm border border-refuted bg-paper-raised p-4 text-sm text-refuted">{tErrors("notFound")}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm">
          {tCommon("backToDashboard")}
        </Link>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className="mx-auto max-w-page px-5 py-16 lg:px-16">
        {loadError ? (
          <p className="rounded-sm border border-refuted bg-paper-raised p-4 text-sm text-refuted">{describe(loadError)}</p>
        ) : (
          <div className="flex justify-center py-16">
            <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-ink" />
          </div>
        )}
      </main>
    );
  }

  const video = analysis.video;
  // print ilegível também pede arquivo novo, mas o arquivo é o print, não o vídeo
  const needsScreenshot = analysis.error_code === "chart_unreadable";
  const needsAnotherFile = needsScreenshot || Boolean(analysis.error_code && NEEDS_ANOTHER_FILE.has(analysis.error_code));
  const result = analysis.status === "completed" ? analysis.result : null;
  // conta grátis: o segundo e a frase estão aqui; as reescritas e o copiloto, não
  const locked = analysis.locked && !analysis.locked.analysis ? analysis.locked : null;
  const plan = analysis.status === "completed" ? analysis.result?.copilot?.recommendations ?? null : null;
  // sem o print, a análise não tem curva nem previsão: o momento foi estimado pelo vídeo
  const estimated = result?.retention_source === "estimated";
  const lastPoint = result?.curve ? result.curve[result.curve.length - 1] : undefined;
  const duration = video.duration_seconds ?? lastPoint?.[0] ?? 0;
  const dropTime = result ? formatTimestamp(result.drop.at_seconds) : null;
  const date = format.dateTime(new Date(video.created_at), { day: "numeric", month: "short", year: "numeric" });
  const meta = [duration ? formatTimestamp(duration) : null, date, result?.language ? t("meta.videoLanguage", { language: languageName(result.language, locale) }) : null].filter(Boolean).join(" · ");

  // em cima do vídeo: o que o player está mostrando na revisão, ou o segundo da queda
  const overlay =
    player.mode !== "idle" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(var(--accent-rgb),0.92)] px-2.5 py-1 text-[11.5px] font-semibold text-paper-raised">
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper-raised" />
        {tReview(`playing.${player.mode}`)}
      </span>
    ) : dropTime ? (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-[rgba(var(--accent-rgb),0.92)] px-2.5 py-[5px] text-[12px] font-medium tracking-[0.02em] text-paper-raised backdrop-blur-sm">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-paper-raised opacity-90" />
        {estimated ? t("meta.likelyDropBadge", { time: dropTime }) : t("meta.dropBadge", { time: dropTime })}
      </span>
    ) : null;

  const transcriptList = result ? (
    <ol className="flex flex-col">
      {result.transcript.map((segment, index) => (
        <li key={index} className="flex gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
          <button type="button" onClick={() => jump(segment.start_seconds)} className="shrink-0 font-display tabular-nums text-ink-muted hover:text-ink">
            {formatTimestamp(segment.start_seconds)}
          </button>
          <span className={segment.text === result.phrase.text ? "font-medium" : ""}>{segment.text}</span>
        </li>
      ))}
    </ol>
  ) : null;

  return (
    <main className="mx-auto max-w-page px-5 pb-24 pt-6 lg:px-10 lg:pt-8">
      {/* ---------- o vídeo: nome, duração, data e estado, numa linha ---------- */}
      <header className="mb-6">
        {!guest && (
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink hover:no-underline">
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            {tCommon("myVideos")}
          </Link>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="min-w-0 font-serif text-[34px] font-normal leading-[1.05] tracking-[-0.01em] [overflow-wrap:anywhere] sm:text-[44px]">{video.filename}</h1>
          {result && !estimated ? <OutcomeBadge outcome={analysis.outcome} /> : <AnalysisStatusBadge status={analysis.status} />}
        </div>
        <p className="mt-1 text-[13px] text-ink-muted">{meta}</p>
      </header>

      {actionError && (
        <p role="alert" className="mb-6 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
          {actionError}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-10">
        {/* ---------- esquerda: o vídeo original, o único player da página (a revisão dos cortes toca nele) ---------- */}
        <aside className="lg:sticky lg:top-6">
          <div className="mx-auto w-full max-w-[220px] sm:max-w-[260px] lg:max-w-none">
            <VideoPlayer ref={attachPlayer} src={playbackUrl} fallback={t("video.noPreview")} overlay={overlay} />
          </div>

          {result?.curve && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="t-label">{t("retention.title")}</span>
                <span className="text-[12px] text-ink-muted">{t("retention.source")}</span>
              </div>
              <Reveal variant="curve">
                <RetentionCurve points={result.curve} durationSec={duration} dropAtSec={result.drop.at_seconds} variant="full" labels={{ watching: t("retention.watching"), drop: t("retention.dropLabel") }} />
              </Reveal>
            </div>
          )}

          {insightsUrl && (
            <details className="mt-4 rounded-md border border-line bg-paper-raised">
              <summary className="px-4 py-3 text-[13px] font-medium">{t("insights.label")}</summary>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária do Storage */}
              <img src={insightsUrl} alt={t("insights.label")} className="block w-full border-t border-line" />
            </details>
          )}
        </aside>

        {/* ---------- direita: o que fazer, na ordem em que se faz ---------- */}
        <div className="flex min-w-0 flex-col gap-6">
          {analysis.blind && <BlindPrediction blind={analysis.blind} onRespond={respondBlind} onSendScreenshot={sendScreenshot} errorMessage={null} />}

          {isActive(analysis.status) && <ProcessingSteps status={analysis.status} step={analysis.step} withInsights={video.has_insights !== false} />}

          {analysis.status === "failed" && (
            <div className="flex flex-col gap-5 rounded-2xl border border-line bg-paper-raised p-6">
              <div>
                <p className="t-label">{t("failed.eyebrow")}</p>
                <h2 className="mt-2 font-display text-[24px] font-medium tracking-[-0.01em]">{t("failed.title")}</h2>
              </div>
              <p className="rounded-sm border border-refuted bg-paper p-3 text-sm text-refuted">{analysis.error_code && tFail.has(analysis.error_code as "generic") ? tFail(analysis.error_code as "generic", analysis.error_params ?? {}) : analysis.error_message}</p>
              {/* cada erro com a ação que resolve ele, não um "tentar novamente" genérico */}
              <div className="flex flex-wrap items-center gap-4">
                {guest || needsAnotherFile ? (
                  <Link href={guest ? "/experimentar" : "/nova-analise"} className={buttonClasses("secondary", "md", "min-h-11")}>
                    {t(needsScreenshot ? "failed.anotherScreenshot" : "failed.tryAnother")}
                  </Link>
                ) : (
                  <Button variant="secondary" className="min-h-11" onClick={retry} disabled={retrying}>
                    {tCommon("retry")}
                  </Button>
                )}
                {!guest && needsAnotherFile && (
                  <button type="button" onClick={retry} disabled={retrying} className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                    {tCommon("retry")}
                  </button>
                )}
              </div>
            </div>
          )}

          {result && (
            <>
              {/* 1. o problema: onde as pessoas saem e por quê */}
              <MainInsight result={result} onSeek={jump} />

              {/* 2. a edição: os cortes sugeridos, que só viram vídeo quando o criador aceita */}
              {!locked && !guest && editData && (
                <CutsPanel
                  suggested={editData.suggested}
                  suggestions={editData.suggestions}
                  decisions={editData.decisions}
                  edit={editData.edit}
                  recommendations={plan ?? []}
                  filename={video.filename}
                  analysisId={id}
                  videoUrl={playbackUrl}
                  player={player}
                  duration={duration}
                  dropAt={result.drop.at_seconds}
                  onApply={applyCuts}
                  onFeedback={sendEditFeedback}
                  errorMessage={actionError}
                />
              )}

              {/* grátis: as primeiras recomendações e as reescritas bloqueadas, com o checkout */}
              {locked && (
                <>
                  <LockedPlan recommendations={result.copilot?.recommendations ?? []} lockedCount={locked.recommendations ?? 0} analysisId={id} onSeek={jump} askEmail={guest} />
                  <section>
                    <h2 className="mb-4 font-display text-[20px] font-bold tracking-[-0.02em]">{t("rewrite.title")}</h2>
                    <LockedRewrites count={locked.rewrites} analysisId={id} />
                  </section>
                </>
              )}

              {/* 3. o resto do que mudar: uma aba de cada vez, em vez de três seções longas */}
              {!locked && (
                <Tabs
                  label={t("tabs.label")}
                  tabs={[
                    {
                      id: "reescritas",
                      label: t("tabs.rewrites"),
                      content: (
                        <>
                          <p className="mb-4 max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">{t("rewrite.lead")}</p>
                          <div className="grid items-start gap-3 xl:grid-cols-3">
                            {result.rewrites.map((rewrite, index) => (
                              <RewriteCard key={index} index={index + 1} rewrite={rewrite} accent={index === 0} />
                            ))}
                          </div>
                        </>
                      ),
                    },
                    {
                      id: "plano",
                      label: t("tabs.plan"),
                      content: (
                        <CopilotPanel
                          embedded
                          copilot={result.copilot ?? null}
                          onSeek={jump}
                          analysisId={id}
                          actions={plan ? <CopyPlanButton markdown={planAsMarkdown(plan, `${video.filename} — ${t("plan.label")}`)} /> : null}
                        />
                      ),
                    },
                    { id: "transcricao", label: t("tabs.transcript"), content: transcriptList },
                  ]}
                />
              )}

              {/* quando vai republicar, e o número real que confere a previsão */}
              {!guest && result.prediction && analysis.outcome === "pending" && (
                <RepublishPlan followup={followup ?? followupData?.followup ?? null} onSchedule={scheduleFollowup} errorMessage={actionError} />
              )}
              {!guest && result.prediction && (
                <PredictionLoop
                  prediction={result.prediction}
                  dropAtSec={result.drop.at_seconds}
                  outcome={analysis.outcome}
                  actualRetention={analysis.actual_retention}
                  recordedAt={analysis.outcome_recorded_at}
                  accuracy={accuracy ?? accuracyData}
                  onRecord={record}
                  errorMessage={actionError}
                />
              )}

              {locked && (
                <details className="border-t border-line pt-5">
                  <summary className="t-label cursor-pointer hover:text-ink">{t("transcript.full")}</summary>
                  <div className="mt-4">{transcriptList}</div>
                </details>
              )}

              {/* depois do valor: levar para o Notion, dizer se foi útil, o próximo vídeo */}
              {!locked && !guest && <NotionSend analysisId={id} />}
              {!guest && <NextStep analysisId={id} showOffer={!locked} />}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const { loading, session } = useSession();
  const guestToken = useSyncExternalStore(noSubscription, readGuestToken, noTokenOnServer);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-accent" />
      </div>
    );
  }

  if (session) {
    return (
      <AppShell session={session}>
        <AnalysisView id={params.id} />
      </AppShell>
    );
  }

  // sem conta, mas com o teste no navegador: mostra a aposta e pede o cadastro depois
  if (guestToken) {
    return (
      <GuestShell>
        <AnalysisView id={params.id} guest />
      </GuestShell>
    );
  }

  // nem conta nem teste: o RequireAuth manda para /login
  return <RequireAuth>{(authed) => <AppShell session={authed}><AnalysisView id={params.id} /></AppShell>}</RequireAuth>;
}
