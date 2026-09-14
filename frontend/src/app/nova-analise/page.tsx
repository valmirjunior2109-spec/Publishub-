"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { Dropzone } from "@/components/Dropzone";
import { Paywall } from "@/components/Paywall";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, UploadError, uploadFile, validateFile, type UploadHandle } from "@/lib/upload";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import { usePolling } from "@/lib/usePolling";
import type { Analysis, Health, Me } from "@/lib/types";

type Phase = "idle" | "video" | "image" | "registering";
type FileErrorKey = "missing" | "type" | "empty" | "size";

function CurveGlyph() {
  return (
    <svg width="44" height="28" viewBox="0 0 44 28" aria-hidden="true">
      <path d="M2 6 H14 C18 6 19 9 19 13 V17 C19 21 22 23 42 23" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="19" cy="11" r="3.5" fill="var(--accent)" />
    </svg>
  );
}

function FilmGlyph() {
  return (
    <svg width="26" height="44" viewBox="0 0 26 44" aria-hidden="true">
      <rect x="1" y="1" width="24" height="42" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 16 L17 22 L11 28 Z" fill="currentColor" />
    </svg>
  );
}

function NewAnalysis({ session }: { session: Session }) {
  const t = useTranslations("NewAnalysis");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const handleApiError = useApiErrorHandler();
  const uploadRef = useRef<UploadHandle | null>(null);

  const [video, setVideo] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [hypothesis, setHypothesis] = useState("");
  const [videoError, setVideoError] = useState<FileErrorKey | null>(null);
  const [imageError, setImageError] = useState<FileErrorKey | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  // o que a conta pode fazer: teste grátis, Creator, limite do mês
  const { data: me, reload: reloadMe } = usePolling<Me>("/api/me", { shouldPoll: () => false });

  useEffect(() => {
    apiFetch<Health>("/api/health")
      .then((health) => setAiConfigured(health.ai_configured))
      .catch(() => {});
  }, []);

  const busy = phase !== "idle";
  const percent = Math.round(progress * 100);

  function pickVideo(file: File | null) {
    const problem = validateFile(file, "video");
    setVideoError(file ? problem : null);
    setVideo(problem ? null : file);
  }

  function pickImage(file: File | null) {
    const problem = validateFile(file, "image");
    setImageError(file ? problem : null);
    setImage(problem ? null : file);
  }

  async function submit() {
    if (!video || !image) return;
    setError(null);
    try {
      setProgress(0);
      setPhase("video");
      uploadRef.current = uploadFile({ file: video, kind: "video", userId: session.user.id, accessToken: session.access_token, onProgress: setProgress });
      const { path: storagePath } = await uploadRef.current.promise;

      setProgress(0);
      setPhase("image");
      uploadRef.current = uploadFile({ file: image, kind: "image", userId: session.user.id, accessToken: session.access_token, onProgress: setProgress });
      const { path: insightsPath } = await uploadRef.current.promise;

      setPhase("registering");
      const created = await apiFetch<{ analysis: Analysis }>("/api/videos", {
        method: "POST",
        body: { storage_path: storagePath, insights_path: insightsPath, filename: video.name, hypothesis: hypothesis.trim() || null },
      });
      router.push(`/analise/${created.analysis.id}`);
    } catch (err) {
      if (err instanceof UploadError) setError(t(`errors.${err.reason}`));
      else if (err instanceof ApiError) {
        if (await handleApiError(err)) return;
        if (err.status === 402) reloadMe(); // o backend recusou por plano: mostra o bloqueio
        setError(err.message || (err.code === "NETWORK_ERROR" ? tErrors("network") : tErrors("generic")));
      } else setError(tErrors("generic"));
      setPhase("idle");
    }
  }

  return (
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-8 lg:px-12 lg:pt-12">
      <div className="stagger max-w-[62ch] border-b border-line pb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-2 font-display text-[34px] font-medium leading-tight tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
      </div>

      {!aiConfigured && <p className="mt-6 rounded-sm border border-pending bg-paper-raised p-3 text-sm text-pending">{t("aiNotConfigured")}</p>}

      {me && !me.entitlement.can_analyze ? (
        <Paywall entitlement={me.entitlement} />
      ) : (
      <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14">
        <div className="stagger flex flex-col gap-8">
          <section>
            <p className="eyebrow">{t("video.label")}</p>
            <Dropzone
              className="mt-3"
              file={video}
              onPick={pickVideo}
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              prompt={t("video.drop")}
              hint={t("video.hint", { mb: MAX_VIDEO_BYTES / 1024 / 1024 })}
              changeLabel={t("change")}
              disabled={busy}
              error={videoError ? t(`errors.${videoError}`) : null}
              glyph={<FilmGlyph />}
            />
          </section>

          <section>
            <p className="eyebrow">{t("image.label")}</p>
            <Dropzone
              className="mt-3"
              file={image}
              onPick={pickImage}
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              prompt={t("image.drop")}
              hint={t("image.hint", { mb: MAX_IMAGE_BYTES / 1024 / 1024 })}
              changeLabel={t("change")}
              disabled={busy}
              error={imageError ? t(`errors.${imageError}`) : null}
              glyph={<CurveGlyph />}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:pt-1">
          <label className="flex flex-col gap-2">
            <span className="eyebrow">{t("hypothesis.label")}</span>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={busy}
              placeholder={t("hypothesis.placeholder")}
              className="w-full rounded-sm border border-line bg-paper-raised px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none disabled:opacity-50"
            />
            <span className="text-[12.5px] text-ink-muted">{t("hypothesis.hint")}</span>
          </label>

          {busy && (
            <div className="flex flex-col gap-2 text-sm" aria-live="polite">
              <div className="flex items-center justify-between">
                <span>{phase === "registering" ? t("progress.registering") : phase === "video" ? t("progress.video") : t("progress.image")}</span>
                {phase !== "registering" && <span className="font-display tabular-nums text-ink-muted">{percent}%</span>}
              </div>
              {phase !== "registering" && (
                <div className="h-1 w-full bg-line">
                  <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${percent}%` }} />
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 px-6" disabled={!video || !image || busy} onClick={submit}>
              {t("submit")}
            </Button>
            {(phase === "video" || phase === "image") && (
              <Button variant="ghost" onClick={() => uploadRef.current?.abort()}>
                {t("cancel")}
              </Button>
            )}
          </div>
        </aside>
      </div>
      )}
    </main>
  );
}

export default function NewAnalysisPage() {
  return (
    <RequireAuth>
      {(session) => (
        <AppShell session={session}>
          <NewAnalysis session={session} />
        </AppShell>
      )}
    </RequireAuth>
  );
}
