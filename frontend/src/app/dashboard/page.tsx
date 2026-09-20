"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ActivatedBanner } from "@/components/ActivatedBanner";
import { AppShell } from "@/components/AppShell";
import { PartnersCard } from "@/components/PartnersCard";
import { RequireAuth } from "@/components/RequireAuth";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { AnalysisStatusBadge, OutcomeBadge } from "@/components/StatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { analyses as sampleAnalyses } from "@/lib/fixtures";
import { formatTimestamp, isActive } from "@/lib/format";
import { useErrorText } from "@/lib/useErrorText";
import { usePolling } from "@/lib/usePolling";
import type { Accuracy, VideoListItem } from "@/lib/types";

const anyActive = (data: { videos: VideoListItem[] }) => data.videos.some((v) => isActive(v.analysis?.status));

/** Número que sobe até o valor final ao aparecer (700 ms). */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = reduced ? 1 : Math.min(1, (now - start) / 700);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>
      {shown}
      {suffix}
    </>
  );
}

function Row({ video, index }: { video: VideoListItem; index: number }) {
  const t = useTranslations("Dashboard.card");
  const format = useFormatter();
  const analysis = video.analysis;
  const done = analysis?.status === "completed" && analysis.drop_at !== null;
  const estimated = analysis?.retention_source === "estimated"; // sem print: momento estimado, sem previsão
  const href = analysis ? `/results/${analysis.id}` : null;

  const body = (
    <>
      {/* 9:16 — o Reel */}
      <span aria-hidden="true" className="relative hidden h-[88px] w-[50px] shrink-0 overflow-hidden rounded-sm border border-line bg-ink sm:block">
        <span className="absolute inset-0 bg-[linear-gradient(160deg,#20302b_0%,#1E1B16_50%,#0f2a24_100%)]" />
        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-paper-raised opacity-70 transition-transform duration-300 group-hover:scale-125" />
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
          <span className="font-display text-[22px] font-semibold tabular-nums tracking-tight">{t(estimated ? "likelyDropAt" : "dropAt", { time: formatTimestamp(analysis.drop_at as number) })}</span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
            {analysis && isActive(analysis.status) && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pending" />}
            {analysis?.status === "failed" ? t("failed") : analysis?.status === "pending" ? t("queued") : t("processing")}
          </span>
        )}
      </span>

      <span className="w-[112px] shrink-0 text-right">{analysis && (done && !estimated ? <OutcomeBadge outcome={analysis.outcome} /> : <AnalysisStatusBadge status={analysis.status} />)}</span>

      <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="hidden shrink-0 text-ink-muted opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 sm:block" />
    </>
  );

  const className = "group flex items-center gap-5 border-t border-line py-4 last:border-b";
  return (
    <Reveal as="div" delay={index * 60} variant="curve">
      {href ? (
        <Link href={href} className={`${className} -mx-3 px-3 transition-colors hover:bg-paper-raised hover:no-underline`}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </Reveal>
  );
}

function EmptyState() {
  const t = useTranslations("Dashboard.empty");
  const sample = sampleAnalyses[0];
  return (
    <section className="grid gap-10 border-t border-line pt-10 lg:grid-cols-[3fr_2fr] lg:items-center">
      <Reveal className="max-w-[52ch]">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">{t("title")}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        <Link href="/nova-analise" className={buttonClasses("primary", "md", "mt-7")}>
          {t("cta")}
        </Link>
      </Reveal>
      <Reveal variant="curve" delay={200} as="figure" className="rounded-md border border-line bg-paper-raised p-4">
        <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
        <figcaption className="mt-2 px-1 text-[12px] text-ink-muted">{t("sampleNote")}</figcaption>
      </Reveal>
    </section>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone?: "accent" | "pending" }) {
  return (
    <div className="rounded-md border border-line bg-paper-raised p-5 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-ink-muted">
      <p className="t-label">{label}</p>
      <p className={`mt-2 font-display text-[40px] font-bold leading-none tabular-nums tracking-tight ${tone === "accent" ? "text-accent" : tone === "pending" ? "text-pending" : ""}`}>
        <Counter value={value} suffix={suffix} />
      </p>
    </div>
  );
}

function Dashboard({ session }: { session: Session }) {
  const t = useTranslations("Dashboard");
  const tCommon = useTranslations("Common");
  const { data, error } = usePolling<{ videos: VideoListItem[] }>("/api/videos", { shouldPoll: anyActive, intervalMs: 4000 });
  const { data: accuracy } = usePolling<Accuracy>("/api/accuracy", { shouldPoll: () => false });
  const errorText = useErrorText();
  const videos = data?.videos ?? null;

  // O backend no plano gratuito do Render dorme; depois de 3 s explicamos a espera.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const firstName = ((session.user.user_metadata?.full_name as string | undefined) || session.user.email?.split("@")[0] || "").trim().split(/\s+/)[0];
  const awaiting = videos?.filter((v) => v.analysis?.status === "completed" && v.analysis.outcome === "pending" && v.analysis.retention_source !== "estimated").length ?? 0;

  return (
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-8 lg:px-12 lg:pt-12">
      <Suspense fallback={null}>
        <ActivatedBanner />
      </Suspense>
      <div className="stagger">
        <p className="eyebrow">{firstName ? t("greeting", { name: firstName }) : t("greetingAnon")}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[34px] font-medium tracking-tight sm:text-[40px]">{t("title")}</h1>
          <Link href="/nova-analise" className={buttonClasses("primary", "md")}>
            {tCommon("newAnalysis")}
          </Link>
        </div>
        {/* o que o produto faz, dito onde a pessoa usa e não só onde ela compra */}
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
      </div>

      {videos && videos.length > 0 && (
        <div className="stagger mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label={t("stats.videos")} value={videos.length} />
          <Stat label={t("stats.confirmed")} value={accuracy?.confirmed ?? 0} tone="accent" />
          <Stat label={t("stats.awaiting")} value={awaiting} tone={awaiting > 0 ? "pending" : undefined} />
        </div>
      )}

      {error && <p className="my-6 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">{errorText(error)}</p>}

      {videos === null && !error && (
        <div className="flex flex-col items-center gap-4 py-24" aria-busy="true">
          <span className="h-5 w-5 animate-spin rounded-full border border-line border-t-accent" />
          {slow && <p className="fade-in max-w-[40ch] text-center text-[13px] leading-relaxed text-ink-muted">{t("waking")}</p>}
        </div>
      )}

      {videos?.length === 0 && (
        <div className="mt-10">
          <EmptyState />
        </div>
      )}

      {videos && videos.length > 0 && (
        <div className="mt-10">
          <p className="eyebrow mb-3">{t("count", { count: videos.length })}</p>
          {videos.map((video, index) => (
            <Row key={video.id} video={video} index={index} />
          ))}
        </div>
      )}

      {/* Publishub Partners: indique criadores, ganhe o Lifetime */}
      {videos !== null && (
        <Reveal className="mt-14">
          <PartnersCard />
        </Reveal>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      {(session) => (
        <AppShell session={session}>
          <Dashboard session={session} />
        </AppShell>
      )}
    </RequireAuth>
  );
}
