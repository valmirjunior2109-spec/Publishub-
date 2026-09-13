"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import AnalysisResult from "@/components/AnalysisResult";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatDate, formatDuration, isActive } from "@/lib/format";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import { usePolling } from "@/lib/usePolling";
import styles from "./analysis.module.css";

const stillProcessing = (analysis) => isActive(analysis.status);

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
        {error ? <p className="alert alert-error">{error.message}</p> : <div className="center-loader"><div className="spinner" /></div>}
      </div>
    );
  }

  const video = analysis.video;
  return (
    <div className="container page">
      <div>
        <Link href="/dashboard" className="small">
          ← Meus vídeos
        </Link>
        <div className={styles.titleRow}>
          <h1 className={`page-title ${styles.title}`}>{video.filename}</h1>
          <StatusBadge status={analysis.status} />
        </div>
        <p className="muted small">
          Enviado em {formatDate(video.created_at)} · {formatDuration(video.duration_seconds)} · {formatBytes(video.size_bytes)}
        </p>
      </div>

      {error && <p className="alert alert-error">{error.message}</p>}

      <div className={styles.layout}>
        <aside className={styles.player}>
          {playbackUrl ? (
            <video ref={videoRef} src={playbackUrl} controls playsInline preload="metadata" className={styles.video} />
          ) : (
            <p className="muted small">Pré-visualização indisponível.</p>
          )}
        </aside>

        <section className={styles.content}>
          {active && (
            <div className="card stack" aria-live="polite">
              <div className={styles.statusLine}>
                <span className="spinner" />
                <strong>{analysis.status === "pending" ? "Na fila para análise…" : "Analisando seu vídeo…"}</strong>
              </div>
              <p className="muted">
                Estamos medindo pausas, cortes e volume e a IA está avaliando hook, edição, legendas e retenção. Isso
                costuma levar de 1 a 3 minutos — pode sair da página, a análise continua.
              </p>
            </div>
          )}

          {analysis.status === "failed" && (
            <div className="card stack">
              <p className="alert alert-error">{analysis.error_message || "A análise não foi concluída."}</p>
              <div>
                <button type="button" className="btn btn-secondary" onClick={retry} disabled={retrying}>
                  {retrying && <span className="spinner spinner-small" />}
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {analysis.status === "completed" && analysis.result && <AnalysisResult result={analysis.result} onSeek={seek} />}
        </section>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  return <RequireAuth>{() => <AnalysisView id={id} />}</RequireAuth>;
}
