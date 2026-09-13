"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import AnalysisResult, { MeasuredSignals } from "@/components/AnalysisResult";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatDate, formatDuration, isActive } from "@/lib/format";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import { usePolling } from "@/lib/usePolling";
import styles from "./analysis.module.css";

const stillProcessing = (analysis) => isActive(analysis.status);

/* Etapas honestas: o backend só distingue "na fila" de "processando"; a medição
   e a IA acontecem dentro de "processando", então aparecem como uma etapa só. */
function stepsFor(status) {
  const queued = status === "pending";
  return [
    { label: "Vídeo recebido", state: "done" },
    { label: "Na fila", state: queued ? "active" : "done" },
    { label: "Medindo o áudio e os cortes, e avaliando com a IA", state: queued ? "todo" : "active" },
    { label: "Recomendações prontas", state: "todo" },
  ];
}

function ProcessingCard({ status }) {
  return (
    <div className={`card ${styles.processing}`} aria-live="polite">
      <div>
        <p className="eyebrow">Análise em andamento</p>
        <h2 className={styles.processingTitle}>{status === "pending" ? "Na fila para análise" : "Analisando seu vídeo"}</h2>
        <p className="muted">Costuma levar de 1 a 3 minutos. Pode sair da página — a análise continua e fica salva aqui.</p>
      </div>
      <ol className={styles.steps}>
        {stepsFor(status).map((step) => (
          <li key={step.label} className={`${styles.step} ${styles[step.state]}`}>
            <span className={styles.stepMark} aria-hidden="true">
              {step.state === "active" ? <span className="spinner spinner-small" /> : null}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AnalysisView({ id }) {
  const { data: analysis, error: loadError, reload } = usePolling(`/api/analyses/${id}`, { shouldPoll: stillProcessing });
  const [actionError, setActionError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const videoRef = useRef(null);
  const handleApiError = useApiErrorHandler();
  const error = actionError || loadError;
  const active = isActive(analysis?.status);
  // Each poll returns a freshly signed URL; keep the first one so the player doesn't reload.
  const [playbackUrl, setPlaybackUrl] = useState(null);
  if (!playbackUrl && analysis?.video?.playback_url) setPlaybackUrl(analysis.video.playback_url);

  async function retry() {
    setRetrying(true);
    setActionError(null);
    try {
      await apiFetch(`/api/analyses/${id}/retry`, { method: "POST" });
      reload();
    } catch (err) {
      if (!(await handleApiError(err))) setActionError(err);
    }
    setRetrying(false);
  }

  function seek(seconds) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, seconds - 0.5);
    video.play().catch(() => {});
    video.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (error?.status === 404) {
    return (
      <div className="container page">
        <p className="alert alert-error">Análise não encontrada.</p>
        <Link href="/dashboard">Voltar para meus vídeos</Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container page">
        {error ? (
          <p className="alert alert-error">{error.message}</p>
        ) : (
          <div className="center-loader">
            <div className="spinner" />
          </div>
        )}
      </div>
    );
  }

  const video = analysis.video;
  const completed = analysis.status === "completed" && analysis.result;

  return (
    <div className="container page">
      <div className={styles.head}>
        <Link href="/dashboard" className={styles.back}>
          ← Meus vídeos
        </Link>
        <div className={styles.titleRow}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{video.filename}</h1>
            <p className="muted small">
              Enviado em {formatDate(video.created_at)} · {formatDuration(video.duration_seconds)} · {formatBytes(video.size_bytes)}
            </p>
          </div>
          <StatusBadge status={analysis.status} />
        </div>
      </div>

      {error && <p className="alert alert-error">{error.message}</p>}

      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div className={`card card-flush ${styles.videoCard}`}>
            {playbackUrl ? (
              <video ref={videoRef} src={playbackUrl} controls playsInline preload="metadata" className={styles.video} />
            ) : (
              <p className={`muted small ${styles.noVideo}`}>Pré-visualização indisponível.</p>
            )}
          </div>
          {completed && <MeasuredSignals signals={analysis.result.signals} onSeek={seek} />}
        </aside>

        <section className={styles.content}>
          {active && <ProcessingCard status={analysis.status} />}

          {analysis.status === "failed" && (
            <div className={`card ${styles.failed}`}>
              <div>
                <p className="eyebrow">Não concluída</p>
                <h2 className={styles.processingTitle}>A análise não terminou</h2>
              </div>
              <p className="alert alert-error">{analysis.error_message || "A análise não foi concluída."}</p>
              <div>
                <button type="button" className="btn btn-secondary" onClick={retry} disabled={retrying}>
                  {retrying && <span className="spinner spinner-small" />}
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {completed && <AnalysisResult result={analysis.result} onSeek={seek} />}
        </section>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  return <RequireAuth>{() => <AnalysisView id={id} />}</RequireAuth>;
}
