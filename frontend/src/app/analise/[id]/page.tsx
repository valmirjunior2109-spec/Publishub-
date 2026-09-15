"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CopilotPanel } from "@/components/CopilotPanel";
import { PredictionLoop } from "@/components/PredictionLoop";
import { ProcessingSteps } from "@/components/ProcessingSteps";
import { RequireAuth } from "@/components/RequireAuth";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { RewriteCard } from "@/components/RewriteCard";
import { AppShell } from "@/components/AppShell";
import { AnalysisStatusBadge, OutcomeBadge } from "@/components/StatusBadge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { formatTimestamp, isActive } from "@/lib/format";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import { usePolling } from "@/lib/usePolling";
import type { Accuracy, Analysis, OutcomeResponse } from "@/lib/types";

const stillProcessing = (analysis: Analysis) => isActive(analysis.status);

function AnalysisView({ id }: { id: string }) {
  const t = useTranslations("Analysis");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("Errors");
  const format = useFormatter();
  const handleApiError = useApiErrorHandler();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: analysis, error: loadError, reload } = usePolling<Analysis>(`/api/analyses/${id}`, { shouldPoll: stillProcessing });
  const { data: accuracyData, reload: reloadAccuracy } = usePolling<Accuracy>("/api/accuracy", { shouldPoll: () => false });
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Each poll returns a freshly signed URL; keep the first one so the player doesn't reload.
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  if (!playbackUrl && analysis?.video.playback_url) setPlaybackUrl(analysis.video.playback_url);
  const [insightsUrl, setInsightsUrl] = useState<string | null>(null);
  if (!insightsUrl && analysis?.video.insights_url) setInsightsUrl(analysis.video.insights_url);

  const describe = (err: unknown) => (err instanceof ApiError ? err.message || (err.code === "NETWORK_ERROR" ? tErrors("network") : tErrors("generic")) : tErrors("generic"));

  async function retry() {
    setRetrying(true);
    setActionError(null);
    try {
      await apiFetch(`/api/analyses/${id}/retry`, { method: "POST" });
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
      reload();
      reloadAccuracy();
    } catch (err) {
      if (!(await handleApiError(err as ApiError))) setActionError(describe(err));
      throw err;
    }
  }

  function seek(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, seconds - 0.5);
    video.play().catch(() => {});
    video.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  const result = analysis.status === "completed" ? analysis.result : null;
  // sem o print, a análise não tem curva nem previsão: o momento foi estimado pelo vídeo
  const estimated = result?.retention_source === "estimated";
  const lastPoint = result?.curve ? result.curve[result.curve.length - 1] : undefined;
  const duration = video.duration_seconds ?? lastPoint?.[0] ?? 0;
  const dropTime = result ? formatTimestamp(result.drop.at_seconds) : null;
  const date = format.dateTime(new Date(video.created_at), { day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="mx-auto max-w-page px-5 pb-24 pt-8 lg:px-16 lg:pt-12">
      {/* breadcrumb */}
      <nav className="mb-10 flex flex-wrap items-center gap-2 text-[12px] uppercase tracking-[0.05em] text-ink-muted lg:mb-12" aria-label="breadcrumb">
        <Link href="/dashboard" className="text-ink-muted hover:text-ink hover:no-underline">
          {tCommon("dashboard")}
        </Link>
        <span className="opacity-40">›</span>
        <span className="text-ink">{tCommon("analysis")}</span>
        <span className="opacity-40">·</span>
        <span>{date}</span>
        {result && !estimated ? <OutcomeBadge outcome={analysis.outcome} /> : <AnalysisStatusBadge status={analysis.status} />}
      </nav>

      {actionError && (
        <p role="alert" className="mb-6 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
          {actionError}
        </p>
      )}

      {/* ---------- 5fr | 7fr ---------- */}
      <div className="grid items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
        {/* esquerda: vídeo + curva */}
        <div>
          <div className="mb-10 w-full max-w-[280px]">
            <VideoPlayer
              ref={videoRef}
              src={playbackUrl}
              fallback={t("video.noPreview")}
              overlay={
                dropTime ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-[rgba(var(--accent-rgb),0.92)] px-2.5 py-[5px] text-[12px] font-medium tracking-[0.02em] text-paper-raised backdrop-blur-sm">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-paper-raised opacity-90" />
                    {estimated ? t("meta.likelyDropBadge", { time: dropTime }) : t("meta.dropBadge", { time: dropTime })}
                  </span>
                ) : null
              }
            />
            <p className="mt-3 font-display text-[13px] font-medium leading-[1.35] [overflow-wrap:anywhere]">{video.filename}</p>
            <p className="mt-1 text-[11px] tracking-[0.03em] text-ink-muted">
              {duration ? `${formatTimestamp(duration)} · ` : ""}
              {date}
            </p>
          </div>

          {result?.curve && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="t-label">{t("retention.title")}</span>
                <span className="text-[12px] text-ink-muted">{t("retention.source")}</span>
              </div>
              <Reveal variant="curve">
                <RetentionCurve points={result.curve} durationSec={duration} dropAtSec={result.drop.at_seconds} variant="full" labels={{ watching: t("retention.watching"), drop: t("retention.dropLabel") }} />
              </Reveal>
            </>
          )}

          {estimated && (
            <Reveal className="rounded-md border border-dashed border-line bg-paper-raised p-5">
              <p className="t-label">{t("estimated.label")}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{t("estimated.lead")}</p>
            </Reveal>
          )}

          {insightsUrl && (
            <details className="mt-6 rounded-md border border-line bg-paper-raised">
              <summary className="px-4 py-3 text-[13px] font-medium">{t("insights.label")}</summary>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária do Storage */}
              <img src={insightsUrl} alt={t("insights.label")} className="block w-full border-t border-line" />
            </details>
          )}
        </div>

        {/* direita: timestamp + frase + diagnóstico (ou estado) */}
        <div className="min-w-0">
          {isActive(analysis.status) && <ProcessingSteps status={analysis.status} step={analysis.step} withInsights={video.has_insights !== false} />}

          {analysis.status === "failed" && (
            <div className="flex flex-col gap-5 rounded-md border border-line bg-paper-raised p-7">
              <div>
                <p className="t-label">{t("failed.eyebrow")}</p>
                <h2 className="mt-2 font-display text-[28px] font-medium tracking-[-0.01em]">{t("failed.title")}</h2>
              </div>
              <p className="rounded-sm border border-refuted bg-paper p-3 text-sm text-refuted">{analysis.error_message}</p>
              <div>
                <Button variant="secondary" onClick={retry} disabled={retrying}>
                  {tCommon("retry")}
                </Button>
              </div>
            </div>
          )}

          {result && (
            <>
              <Reveal className="mb-7">
                <p className="t-label mb-2 tracking-[0.08em]">{estimated ? t("drop.estimatedEyebrow") : t("drop.eyebrow")}</p>
                <p className="t-display-xl text-accent">{dropTime}</p>
                <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-ink-muted">
                  {result.drop.retained_before !== null && result.drop.retained_after !== null
                    ? t("drop.summary", { from: Math.round(result.drop.retained_before), to: Math.round(result.drop.retained_after), span: 2 })
                    : result.drop.reason || t("drop.estimatedSummary")}
                </p>
              </Reveal>

              <div className="mb-9 h-px bg-line" />

              <Reveal delay={120} className="mb-9">
                <p className="t-label mb-4 tracking-[0.08em]">{t("transcript.label")}</p>
                <blockquote className="t-quote border-l-[3px] border-accent pl-5">&ldquo;{result.phrase.text}&rdquo;</blockquote>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
                  {result.phrase.before && <span className="italic">…{result.phrase.before}</span>}
                  <button type="button" onClick={() => seek(result.phrase.start_seconds)} className="inline-flex items-center gap-1.5 font-medium text-ink-muted hover:text-ink">
                    <span aria-hidden="true" className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-accent" />
                    {formatTimestamp(result.phrase.start_seconds)} → {formatTimestamp(result.phrase.end_seconds)}
                  </button>
                </div>
              </Reveal>

              <Reveal delay={240} className="rounded-md border border-line bg-paper-raised p-7">
                <p className="t-label mb-3.5 tracking-[0.08em]">{t("diagnosis.label")}</p>
                <p className="t-body-l">{result.diagnosis}</p>
                {result.hypothesis && (
                  <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-muted">
                    <span className="font-medium text-ink">{t("transcript.hypothesisLabel")}:</span> {result.hypothesis}
                  </p>
                )}
              </Reveal>
            </>
          )}
        </div>
      </div>

      {result && (
        <>
          {/* ---------- Reescreva assim — largura total ---------- */}
          <section className="mt-20">
            <div className="mb-8 flex items-center gap-7">
              <div className="h-px flex-1 bg-line" />
              <h2 className="whitespace-nowrap font-display text-[22px] font-medium tracking-[-0.01em]">{t("rewrite.title")}</h2>
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="grid items-start gap-4 md:grid-cols-[1.15fr_0.93fr_0.93fr]">
              {result.rewrites.map((rewrite, index) => (
                <Reveal key={index} delay={index * 120} className="h-full">
                  <RewriteCard index={index + 1} rewrite={rewrite} accent={index === 0} />
                </Reveal>
              ))}
            </div>
          </section>

          {/* ---------- Copiloto de edição — o vídeo inteiro ---------- */}
          <CopilotPanel copilot={result.copilot ?? null} onSeek={seek} />

          {/* ---------- Loop de previsão ---------- */}
          {result.prediction && (
          <div className="mt-20">
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
          </div>
          )}

          <details className="mt-10 border-t border-line pt-6">
            <summary className="t-label cursor-pointer hover:text-ink">{t("transcript.full")}</summary>
            <ol className="mt-4 flex flex-col">
              {result.transcript.map((segment, index) => (
                <li key={index} className="flex gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
                  <button type="button" onClick={() => seek(segment.start_seconds)} className="shrink-0 font-display tabular-nums text-ink-muted hover:text-ink">
                    {formatTimestamp(segment.start_seconds)}
                  </button>
                  <span className={segment.text === result.phrase.text ? "font-medium" : ""}>{segment.text}</span>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </main>
  );
}

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth>
      {(session) => (
        <AppShell session={session}>
          <AnalysisView id={params.id} />
        </AppShell>
      )}
    </RequireAuth>
  );
}
