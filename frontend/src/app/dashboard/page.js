"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatDuration, isActive, scoreTone } from "@/lib/format";
import { usePolling } from "@/lib/usePolling";
import styles from "./dashboard.module.css";

const hasActiveAnalysis = (data) => data.videos.some((v) => isActive(v.analysis?.status));

const ONBOARDING = [
  { title: "Envie um vídeo", text: "De preferência o corte que você pretende publicar." },
  { title: "Espere uns minutos", text: "Medimos o áudio e os cortes; a IA avalia os frames." },
  { title: "Aplique no seu editor", text: "Cada recomendação vem com o momento exato do vídeo." },
];

function summarize(videos) {
  const completed = videos.filter((v) => v.analysis?.status === "completed");
  const scores = completed.map((v) => v.analysis?.overall_score).filter((s) => typeof s === "number");
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  return { total: videos.length, completed: completed.length, average };
}

function VideoCard({ video }) {
  const analysis = video.analysis;
  const score = analysis?.status === "completed" ? analysis.overall_score : null;
  const body = (
    <>
      <div className={styles.cardTop}>
        {analysis ? <StatusBadge status={analysis.status} /> : <span className="badge">Sem análise</span>}
        <span className="muted small">{formatDate(video.created_at)}</span>
      </div>
      <p className={styles.cardTitle}>{video.filename}</p>
      <p className="muted small">{formatDuration(video.duration_seconds)} de vídeo</p>
      <div className={styles.cardBottom}>
        {typeof score === "number" ? (
          <span className={`${styles.score} ${scoreTone(score, 100)}`}>
            {score}
            <small>/100</small>
          </span>
        ) : (
          <span className="muted small">{analysis?.status === "failed" ? "Não concluída" : "Nota em breve"}</span>
        )}
        {analysis && <span className={styles.cardLink}>Ver análise →</span>}
      </div>
    </>
  );

  return analysis ? (
    <Link href={`/analysis/${analysis.id}`} className={`${styles.card} ${styles.cardClickable}`}>
      {body}
    </Link>
  ) : (
    <div className={styles.card}>{body}</div>
  );
}

function Dashboard() {
  const { data, error } = usePolling("/api/videos", { shouldPoll: hasActiveAnalysis, intervalMs: 4000 });
  const videos = data?.videos ?? null;
  const summary = videos?.length ? summarize(videos) : null;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Meus vídeos</p>
          <h1 className="page-title">Suas análises</h1>
          {summary && (
            <p className="page-lead">
              {summary.total} {summary.total === 1 ? "vídeo" : "vídeos"} · {summary.completed} {summary.completed === 1 ? "analisado" : "analisados"}
              {summary.average !== null && ` · nota média ${summary.average}`}
            </p>
          )}
        </div>
        {videos?.length > 0 && (
          <Link href="/analyze" className="btn btn-primary">
            Nova análise
          </Link>
        )}
      </div>

      {error && <p className="alert alert-error">{error.message}</p>}

      {videos === null && !error && (
        <div className="center-loader">
          <div className="spinner" />
        </div>
      )}

      {videos?.length === 0 && (
        <section className={styles.empty}>
          <div className={styles.emptyText}>
            <p className="eyebrow">Primeiro acesso</p>
            <h2 className={styles.emptyTitle}>Envie seu primeiro vídeo e veja o que dá para melhorar antes de publicar</h2>
            <p className="muted">Em poucos minutos você recebe hook, cortes, legendas e retenção avaliados — com o momento exato de cada ajuste.</p>
            <Link href="/analyze" className="btn btn-primary btn-lg">
              Analisar meu primeiro vídeo
            </Link>
          </div>
          <ol className={styles.onboarding}>
            {ONBOARDING.map((step, index) => (
              <li key={step.title} className={styles.onboardingStep}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className="muted small">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {videos?.length > 0 && (
        <div className={styles.grid}>
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <RequireAuth>{() => <Dashboard />}</RequireAuth>;
}
