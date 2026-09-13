"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { RequireAuth } from "@/components/RequireAuth";
import { RetentionCurve } from "@/components/RetentionCurve";
import { SiteHeader } from "@/components/SiteHeader";
import { AnalysisStatusBadge, OutcomeBadge } from "@/components/StatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { analyses as sampleAnalyses } from "@/lib/fixtures";
import { formatTimestamp, isActive } from "@/lib/format";
import { usePolling } from "@/lib/usePolling";
import type { Accuracy, VideoListItem } from "@/lib/types";

const anyActive = (data: { videos: VideoListItem[] }) => data.videos.some((v) => isActive(v.analysis?.status));

function Row({ video }: { video: VideoListItem }) {
  const t = useTranslations("Dashboard.card");
  const format = useFormatter();
  const analysis = video.analysis;
  const done = analysis?.status === "completed" && analysis.drop_at !== null;
  const href = analysis ? `/analise/${analysis.id}` : null;

  const body = (
    <>
      {/* 9:16 — o Reel */}
      <span aria-hidden="true" className="relative hidden h-[88px] w-[50px] shrink-0 overflow-hidden rounded-sm border border-line bg-ink sm:block">
        <span className="absolute inset-0 bg-[linear-gradient(160deg,#2e2720_0%,#1E1B16_50%,#2d1a0e_100%)]" />
        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-paper-raised opacity-70" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[18px] font-medium tracking-tight">{video.filename}</span>
        <span className="mt-0.5 block text-[13px] text-ink-muted">
          {format.dateTime(new Date(video.created_at), { day: "numeric", month: "short" })}
          {video.duration_seconds ? ` · ${formatTimestamp(video.duration_seconds)}` : ""}
        </span>
      </span>

      {done && analysis.curve && (
        <span className="hidden shrink-0 md:block">
          <RetentionCurve points={analysis.curve} durationSec={video.duration_seconds ?? analysis.curve[analysis.curve.length - 1][0]} dropAtSec={analysis.drop_at as number} variant="medium" className="block h-9 w-[120px]" />
        </span>
      )}

      <span className="w-[132px] shrink-0 text-right">
        {done ? (
          <span className="font-display text-[22px] font-semibold tabular-nums tracking-tight">{t("dropAt", { time: formatTimestamp(analysis.drop_at as number) })}</span>
        ) : (
          <span className="text-[13px] text-ink-muted">{analysis?.status === "failed" ? t("failed") : analysis?.status === "pending" ? t("queued") : t("processing")}</span>
        )}
      </span>

      <span className="w-[112px] shrink-0 text-right">{analysis && (done ? <OutcomeBadge outcome={analysis.outcome} /> : <AnalysisStatusBadge status={analysis.status} />)}</span>
    </>
  );

  const className = "flex items-center gap-5 border-t border-line py-4 last:border-b";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-paper-raised hover:no-underline`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function EmptyState() {
  const t = useTranslations("Dashboard.empty");
  const sample = sampleAnalyses[0];
  return (
    <section className="grid gap-10 border-t border-line pt-10 lg:grid-cols-[3fr_2fr] lg:items-center">
      <div className="max-w-[52ch]">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">{t("title")}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        <Link href="/nova-analise" className={buttonClasses("primary", "md", "mt-7")}>
          {t("cta")}
        </Link>
      </div>
      <figure className="rounded-md border border-line bg-paper-raised p-4">
        <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
        <figcaption className="mt-2 px-1 text-[12px] text-ink-muted">{t("sampleNote")}</figcaption>
      </figure>
    </section>
  );
}

function Dashboard() {
  const t = useTranslations("Dashboard");
  const { data, error } = usePolling<{ videos: VideoListItem[] }>("/api/videos", { shouldPoll: anyActive, intervalMs: 4000 });
  const { data: accuracy } = usePolling<Accuracy>("/api/accuracy", { shouldPoll: () => false });
  const tErrors = useTranslations("Errors");
  const videos = data?.videos ?? null;

  return (
    <main className="mx-auto max-w-page px-5 pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-[34px] font-medium tracking-tight">{t("title")}</h1>
          {videos && videos.length > 0 && <p className="mt-2 text-sm text-ink-muted">{t("count", { count: videos.length })}</p>}
        </div>
        {accuracy && accuracy.total > 0 && (
          <div className="text-right">
            <p className="eyebrow">{t("accuracy.label")}</p>
            <p className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums tracking-tight">{accuracy.rate}%</p>
            <p className="mt-1 text-[13px] text-ink-muted">{t("accuracy.detail", { confirmed: accuracy.confirmed, total: accuracy.total })}</p>
          </div>
        )}
      </div>

      {error && <p className="mb-6 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">{error.message || (error.code === "NETWORK_ERROR" ? tErrors("network") : tErrors("generic"))}</p>}

      {videos === null && !error && (
        <div className="flex justify-center py-24">
          <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-ink" />
        </div>
      )}

      {videos?.length === 0 && <EmptyState />}

      {videos && videos.length > 0 && (
        <div>
          {videos.map((video) => (
            <Row key={video.id} video={video} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <>
      <SiteHeader />
      <RequireAuth>{() => <Dashboard />}</RequireAuth>
    </>
  );
}
