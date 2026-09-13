"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { formatBytes, formatDate, formatDuration, isActive } from "@/lib/format";
import { usePolling } from "@/lib/usePolling";
import styles from "./dashboard.module.css";

const hasActiveAnalysis = (data) => data.videos.some((v) => isActive(v.analysis?.status));

function Dashboard() {
  const { data, error } = usePolling("/api/videos", { shouldPoll: hasActiveAnalysis, intervalMs: 4000 });
  const videos = data?.videos ?? null;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meus vídeos</h1>
          <p className="muted">Acompanhe suas análises e veja as recomendações de cada vídeo.</p>
        </div>
        <Link href="/analyze" className="btn btn-primary">
          Nova análise
        </Link>
      </div>

      {error && <p className="alert alert-error">{error.message}</p>}

      {videos === null && !error && (
        <div className="center-loader">
          <div className="spinner" />
        </div>
      )}

      {videos?.length === 0 && (
        <div className={`card ${styles.empty}`}>
          <h2>Nenhum vídeo ainda</h2>
          <p className="muted">Envie seu primeiro vídeo e receba recomendações de hook, edição, legendas e retenção.</p>
          <Link href="/analyze" className="btn btn-primary">
            Analisar meu primeiro vídeo
          </Link>
        </div>
      )}

      {videos?.length > 0 && (
        <ul className={styles.list}>
          {videos.map((video) => {
            const content = (
              <>
                <div className={styles.info}>
                  <span className={styles.name}>{video.filename}</span>
                  <span className="muted small">
                    {formatDate(video.created_at)} · {formatDuration(video.duration_seconds)} · {formatBytes(video.size_bytes)}
                  </span>
                </div>
                {video.analysis && <StatusBadge status={video.analysis.status} />}
              </>
            );
            return (
              <li key={video.id}>
                {video.analysis ? (
                  <Link href={`/analysis/${video.analysis.id}`} className={styles.item}>
                    {content}
                  </Link>
                ) : (
                  <div className={styles.item}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <RequireAuth>{() => <Dashboard />}</RequireAuth>;
}
