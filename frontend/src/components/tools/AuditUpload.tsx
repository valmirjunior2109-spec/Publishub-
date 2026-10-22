"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Dropzone } from "@/components/Dropzone";
import { TrackedLink } from "@/components/TrackedLink";
import { Button, buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { capture } from "@/lib/analytics";
import { readLastAudit } from "@/lib/auditHistory";
import { readGuestToken } from "@/lib/guest";
import { useSession } from "@/lib/session";
import { captureTool, toolFailed, toolStarted } from "@/lib/toolAnalytics";
import { MAX_VIDEO_BYTES, validateFile } from "@/lib/upload";
import { useGuestUpload } from "@/lib/useGuestUpload";
import { usePolling } from "@/lib/usePolling";
import type { VideoListItem } from "@/lib/types";

type FileErrorKey = "missing" | "type" | "empty" | "size";

const toReport = (analysisId: string) => `/tools/video-audit/${analysisId}`;
/** Quantos relatórios anteriores aparecem para quem tem conta (o resto fica no painel). */
const RECENT = 5;

/* O localStorage não existe no servidor (ver AuditView). */
const noSubscription = () => () => {};
const nothingOnServer = () => null;

function FilmGlyph() {
  return (
    <svg width="26" height="44" viewBox="0 0 26 44" aria-hidden="true">
      <rect x="1" y="1" width="24" height="42" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 16 L17 22 L11 28 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * O envio da auditoria grátis: o mesmo envio de convidado do /try (sessão,
 * URL assinada, registro e o limite por visitante do backend), mas a análise
 * criada abre o relatório da auditoria. Quem já tem conta analisa pelo painel.
 */
export function AuditUpload() {
  const t = useTranslations("Tools.audit");
  const tTry = useTranslations("Try");
  const locale = useLocale();
  const { session, loading } = useSession();
  const onFailure = useCallback((code: string) => toolFailed("video_audit", code, { stage: "upload" }), []);
  const { phase, busy, percent, error, setError, start, abort } = useGuestUpload({ destination: toReport, onFailure });
  // o convidado que já fez uma auditoria neste navegador: o atalho de volta para ela
  const lastAudit = useSyncExternalStore(noSubscription, readLastAudit, nothingOnServer);
  const guestToken = useSyncExternalStore(noSubscription, readGuestToken, nothingOnServer);

  const [video, setVideo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<FileErrorKey | null>(null);

  // uma vez por visita: a entrada do funil da auditoria
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    capture("audit_page_viewed", null, locale);
    captureTool("free_tool_viewed", "video_audit");
  }, [locale]);

  function pick(file: File | null) {
    const problem = validateFile(file, "video");
    setFileError(file ? problem : null);
    setVideo(problem ? null : file);
    setError(null);
  }

  function submit(file: File) {
    toolStarted("video_audit", { size_mb: Math.round((file.size / 1024 / 1024) * 10) / 10, authenticated: false });
    start(file);
  }

  if (!loading && session) return <SignedIn />;

  return (
    <div>
      {lastAudit && guestToken && (
        <Link
          href={toReport(lastAudit)}
          className="mb-4 flex items-center justify-between gap-3 rounded-[18px] border border-line bg-paper-raised px-5 py-4 text-[14.5px] font-medium hover:no-underline hover:border-[rgba(var(--accent-rgb),0.45)]"
        >
          {t("lastReport")}
          <ArrowRight size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-accent" />
        </Link>
      )}
      <Dropzone
        file={video}
        onPick={pick}
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        prompt={t("drop")}
        hint={t("hint", { mb: MAX_VIDEO_BYTES / 1024 / 1024 })}
        changeLabel={tTry("change")}
        disabled={busy}
        error={fileError ? tTry(`errors.${fileError}`) : null}
        glyph={<FilmGlyph />}
      />

      {busy && (
        <div className="mt-6 flex flex-col gap-2 text-sm" aria-live="polite">
          <div className="flex items-center justify-between">
            <span>{phase === "registering" ? tTry("progress.registering") : tTry("progress.uploading")}</span>
            {phase === "uploading" && <span className="font-display tabular-nums text-ink-muted">{percent}%</span>}
          </div>
          {phase === "uploading" && (
            <div className="h-1 w-full bg-line">
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-refuted bg-paper-raised p-3 text-sm text-refuted">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="min-h-12 w-full sm:w-auto sm:px-8" disabled={!video || busy} onClick={() => video && submit(video)}>
          {t("submit")}
        </Button>
        {phase === "uploading" && (
          <Button variant="ghost" className="min-h-12 w-full sm:w-auto" onClick={abort}>
            {tTry("cancel")}
          </Button>
        )}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
        {t("noAccount")}{" "}
        <Link href={localePath(locale, "/login")} className="underline-offset-2 hover:underline">
          {t("haveAccount")}
        </Link>
      </p>
    </div>
  );
}

/**
 * Quem tem conta analisa pelo painel (a análise fica salva nela) e vê aqui os
 * relatórios das análises que já fez: cada uma abre como auditoria também.
 */
function SignedIn() {
  const t = useTranslations("Tools.audit");
  const format = useFormatter();
  const { data, error } = usePolling<{ videos: VideoListItem[] }>("/api/videos", { shouldPoll: () => false, redirectWhenExpired: false });
  const done = (data?.videos ?? []).filter((video) => video.analysis?.status === "completed").slice(0, RECENT);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[22px] border border-line bg-paper-raised p-6 sm:p-7">
        <p className="text-[15px] leading-relaxed">{t("signedIn")}</p>
        <TrackedLink where="audit_signed_in" href="/new-analysis" className={buttonClasses("primary", "md", "mt-4 min-h-11")}>
          {t("signedInCta")}
        </TrackedLink>
      </div>

      {!data && !error && <div aria-busy="true" className="h-24 animate-pulse rounded-[22px] border border-line bg-paper-raised" />}
      {data && (
        <section aria-labelledby="audit-recent" className="rounded-[22px] border border-line bg-paper-raised p-6 sm:p-7">
          <h2 id="audit-recent" className="t-label">
            {t("recentTitle")}
          </h2>
          {done.length === 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{t("recentEmpty")}</p>
          ) : (
            <ul className="mt-3 flex flex-col">
              {done.map((video) => (
                <li key={video.id} className="border-b border-line last:border-b-0">
                  <Link href={toReport(video.analysis!.id)} className="flex min-h-12 items-center justify-between gap-3 py-2.5 hover:no-underline">
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-medium text-ink">{video.filename}</span>
                      <span className="block font-mono text-[12px] text-ink-muted">{format.dateTime(new Date(video.created_at), { day: "numeric", month: "short" })}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-accent">{t("recentOpen")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard" className="mt-3 inline-block text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            {t("recentAll")}
          </Link>
        </section>
      )}
    </div>
  );
}
