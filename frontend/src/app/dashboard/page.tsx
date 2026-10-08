"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useRecommendationText } from "@/components/ActionPlan";
import { ActivatedBanner } from "@/components/ActivatedBanner";
import { AppShell } from "@/components/AppShell";
import { OnboardingGate } from "@/components/OnboardingGate";
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
  const recommendationText = useRecommendationText();
  const analysis = video.analysis;
  const done = analysis?.status === "completed" && analysis.drop_at !== null;
  const estimated = analysis?.retention_source === "estimated"; // sem print: momento estimado, sem previsão
  const href = analysis ? `/results/${analysis.id}` : null;

  const body = (
    <>
      {/* 9:16, o Reel */}
      <span aria-hidden="true" className="relative hidden h-[72px] w-[41px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface sm:block">
        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-ink-muted transition-colors duration-150 group-hover:border-l-accent" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold tracking-[-0.015em]">{video.filename}</span>
        <span className="mt-0.5 block font-mono text-[12px] text-ink-muted">
          {format.dateTime(new Date(video.created_at), { day: "numeric", month: "short" })}
          {video.duration_seconds ? ` · ${formatTimestamp(video.duration_seconds)}` : ""}
        </span>
        {/* o que a análise achou: a frase dita no segundo da queda */}
        {done && analysis.phrase && <span className="mt-1.5 block truncate text-[14px] text-ink">&ldquo;{analysis.phrase}&rdquo;</span>}
        {/* e o que mudar primeiro: o histórico vira lista do que fazer, não só do que deu errado */}
        {done && analysis.fix_first && (
          <span className="mt-1 block truncate text-[13px] text-ink-muted">
            <span className="font-medium text-accent">{t("fixFirst")}</span> {recommendationText(analysis.fix_first).title}
          </span>
        )}
      </span>

      {done && analysis.curve && (
        <span className="hidden shrink-0 md:block">
          <RetentionCurve points={analysis.curve} durationSec={video.duration_seconds ?? analysis.curve[analysis.curve.length - 1][0]} dropAtSec={analysis.drop_at as number} variant="medium" className="block h-9 w-[120px]" />
        </span>
      )}

      <span className="shrink-0 text-right sm:w-[132px]">
        {done ? (
          <span className="flex flex-col items-end">
            <span className="t-label">{t(estimated ? "likelyDropLabel" : "dropLabel")}</span>
            <span className="mt-1.5 font-mono text-[22px] font-medium leading-none tabular-nums text-accent">{formatTimestamp(analysis.drop_at as number)}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
            {analysis && isActive(analysis.status) && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pending" />}
            {analysis?.status === "failed" ? t("failed") : analysis?.status === "pending" ? t("queued") : t("processing")}
          </span>
        )}
      </span>

      <span className="hidden w-[112px] shrink-0 text-right sm:block">{analysis && (done && !estimated ? <OutcomeBadge outcome={analysis.outcome} /> : <AnalysisStatusBadge status={analysis.status} />)}</span>

      <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-muted transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-ink sm:opacity-0 sm:group-hover:opacity-100" />
    </>
  );

  const className = "group flex items-center gap-5 px-4 py-4 sm:px-5";
  return (
    <Reveal as="div" delay={index * 60} variant="curve" className="border-t border-line first:border-t-0">
      {href ? (
        <Link href={href} className={`${className} transition-colors hover:bg-surface hover:no-underline`}>
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
        <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[40px]">{t("title")}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        <Link href="/nova-analise" className={buttonClasses("primary", "md", "mt-7")}>
          {t("cta")}
        </Link>
      </Reveal>
      <Reveal variant="curve" delay={200} as="figure" className="rounded-2xl border border-line bg-paper-raised p-5">
        <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
        <figcaption className="mt-2 px-1 text-[12px] text-ink-muted">{t("sampleNote")}</figcaption>
      </Reveal>
    </section>
  );
}

/**
 * O próximo passo do vídeo mais recente, dito com um botão: revisar os cortes
 * sugeridos, acompanhar a análise ou tentar de novo. O painel deixa de ser só uma
 * lista e passa a dizer o que fazer agora.
 */
function ContinueCard({ video }: { video: VideoListItem }) {
  const t = useTranslations("Dashboard.continue");
  const analysis = video.analysis;
  if (!analysis) return null;
  const state = isActive(analysis.status) ? "analyzing" : analysis.status === "failed" ? "failed" : "review";
  const href = `/results/${analysis.id}${state === "review" ? "#revisar" : ""}`;
  return (
    <Reveal className="relative mt-10 flex flex-col gap-5 overflow-hidden rounded-2xl border border-line bg-paper-raised p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      {/* a linha rosa à esquerda: o que pede ação agora */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
      <div className="min-w-0">
        <p className="eyebrow flex items-center gap-2">
          {state === "analyzing" && <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
          {t("eyebrow")}
        </p>
        <p className="mt-2 truncate text-[22px] font-semibold tracking-[-0.03em] sm:text-[26px]">{video.filename}</p>
        <p className="mt-1.5 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-muted">{t(`${state}.lead`)}</p>
      </div>
      <Link href={href} className={buttonClasses("primary", "md", "shrink-0")}>
        {t(`${state}.cta`)}
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </Reveal>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone?: "accent" | "pending" }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-paper-raised px-5 py-4 sm:block sm:p-6">
      <p className="t-label">{label}</p>
      <p className={`font-display text-[30px] font-semibold leading-none tracking-[-0.045em] tabular-nums sm:mt-4 sm:text-[44px] ${tone === "accent" ? "text-accent" : tone === "pending" ? "text-pending" : ""}`}>
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
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      {/* primeira visita: as boas-vindas antes do painel vazio */}
      <OnboardingGate />
      <Suspense fallback={null}>
        <ActivatedBanner />
      </Suspense>
      <div className="stagger">
        <p className="eyebrow">{firstName ? t("greeting", { name: firstName }) : t("greetingAnon")}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[38px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[52px]">{t("title")}</h1>
          {/* no celular o botão já está no cabeçalho do app */}
          <Link href="/nova-analise" className={buttonClasses("primary", "md", "hidden sm:inline-flex")}>
            {tCommon("newAnalysis")}
          </Link>
        </div>
        {/* o que o produto faz, dito onde a pessoa usa e não só onde ela compra */}
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
      </div>

      {videos && videos.length > 0 && <ContinueCard video={videos[0]} />}

      {videos && videos.length > 0 && (
        <div className="stagger mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat label={t("stats.videos")} value={videos.length} />
          <Stat label={t("stats.confirmed")} value={accuracy?.confirmed ?? 0} tone="accent" />
          <Stat label={t("stats.awaiting")} value={awaiting} tone={awaiting > 0 ? "pending" : undefined} />
        </div>
      )}

      {error && <p className="my-6 rounded-lg border border-refuted bg-paper-raised p-3 text-sm text-refuted">{errorText(error)}</p>}

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
        <div className="mt-14">
          <p className="t-label mb-3">{t("count", { count: videos.length })}</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised">
            {videos.map((video, index) => (
              <Row key={video.id} video={video} index={index} />
            ))}
          </div>
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
