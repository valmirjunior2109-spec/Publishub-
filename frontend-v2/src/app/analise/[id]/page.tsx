import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { PredictionLoop } from "@/components/PredictionLoop";
import { RetentionCurve } from "@/components/RetentionCurve";
import { RewriteCard } from "@/components/RewriteCard";
import { SiteHeader } from "@/components/SiteHeader";
import { VideoFrame } from "@/components/VideoFrame";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { accuracyStats, getAnalysis } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  const analysis = getAnalysis(id);
  if (!analysis) notFound();

  const t = await getTranslations("Analysis");
  const tCommon = await getTranslations("Common");
  const tStatus = await getTranslations("Status");
  const format = await getFormatter();

  const retainedAt = (second: number) => {
    const clamped = Math.min(Math.max(second, 0), analysis.durationSec);
    return Math.round(analysis.retention.find((p) => p.t === clamped)?.retained ?? 0);
  };
  const dropSpan = 2;
  const dropTime = formatTimestamp(analysis.dropAtSec);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-page px-5 pb-24 pt-8 lg:pt-12">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
          {tCommon("backToDashboard")}
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="min-w-0">
            <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[34px]">{analysis.title}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              {t("meta.publishedOn", {
                date: format.dateTime(new Date(analysis.createdAt), { day: "numeric", month: "long", year: "numeric" }),
              })}
              {" · "}
              {t("meta.duration", { seconds: analysis.durationSec })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{t("meta.dropBadge", { time: dropTime })}</Badge>
            <Badge tone={analysis.prediction.status} dot>
              {tStatus(analysis.prediction.status)}
            </Badge>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
          {/* ---------- esquerda: vídeo e curva ---------- */}
          <aside className="space-y-6">
            <div className="mx-auto max-w-[300px] lg:max-w-none">
              <VideoFrame
                title={analysis.title}
                durationSec={analysis.durationSec}
                dropAtSec={analysis.dropAtSec}
                labels={{ preview: t("video.preview"), drop: t("video.dropMarker") }}
              />
            </div>

            <Card flush className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
                <h2 className="font-display text-lg font-medium">{t("retention.title")}</h2>
                <span className="text-xs text-ink-muted">{t("retention.source")}</span>
              </div>
              <div className="mt-3">
                <RetentionCurve
                  points={analysis.retention}
                  durationSec={analysis.durationSec}
                  dropAtSec={analysis.dropAtSec}
                  labels={{ watching: t("retention.watching"), drop: t("retention.dropLabel") }}
                />
              </div>
            </Card>
          </aside>

          {/* ---------- direita: diagnóstico e entregáveis ---------- */}
          <article className="min-w-0">
            <p className="eyebrow">{t("drop.eyebrow")}</p>
            <p className="mt-2 font-display text-[96px] font-bold leading-none tracking-[-0.03em] sm:text-[128px]">{dropTime}</p>
            <p className="mt-3 text-sm text-ink-muted">
              {t("drop.summary", {
                from: retainedAt(analysis.dropAtSec),
                to: retainedAt(analysis.dropAtSec + dropSpan),
                span: dropSpan,
              })}
            </p>

            <section className="mt-10">
              <p className="eyebrow">{t("transcript.label")}</p>
              <blockquote className="mt-3 border-l-2 border-accent pl-5">
                {analysis.transcript.before && <span className="block text-sm text-ink-muted">{analysis.transcript.before}</span>}
                <p className="mt-1 font-display text-[24px] italic leading-snug tracking-tight sm:text-[28px]">
                  &ldquo;{analysis.transcript.phrase}&rdquo;
                </p>
                {analysis.transcript.after && <span className="mt-1 block text-sm text-ink-muted">{analysis.transcript.after}</span>}
              </blockquote>
            </section>

            <section className="mt-8">
              <p className="eyebrow">{t("diagnosis.label")}</p>
              <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed">{analysis.diagnosis}</p>
            </section>

            <section className="mt-14 border-t border-line pt-10">
              <h2 className="font-display text-[28px] font-medium tracking-tight sm:text-[32px]">{t("rewrite.title")}</h2>
              <p className="mt-2 max-w-[60ch] text-sm text-ink-muted">{t("rewrite.lead")}</p>
              <div className="mt-6 space-y-4">
                {analysis.rewrites.map((rewrite, index) => (
                  <RewriteCard key={rewrite.id} index={index + 1} rewrite={rewrite} whyLabel={t("rewrite.why")} />
                ))}
              </div>
            </section>

            <section className="mt-14 border-t border-line pt-10">
              <PredictionLoop prediction={analysis.prediction} dropAtSec={analysis.dropAtSec} accuracy={accuracyStats()} />
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
