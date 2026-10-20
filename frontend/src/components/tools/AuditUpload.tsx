"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dropzone } from "@/components/Dropzone";
import { Button, buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { capture } from "@/lib/analytics";
import { useSession } from "@/lib/session";
import { MAX_VIDEO_BYTES, validateFile } from "@/lib/upload";
import { useGuestUpload } from "@/lib/useGuestUpload";

type FileErrorKey = "missing" | "type" | "empty" | "size";

const toReport = (analysisId: string) => `/tools/video-audit/${analysisId}`;

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
  const { phase, busy, percent, error, setError, start, abort } = useGuestUpload({ destination: toReport });

  const [video, setVideo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<FileErrorKey | null>(null);

  // uma vez por visita: a entrada do funil da auditoria
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    capture("audit_page_viewed", null, locale);
  }, [locale]);

  function pick(file: File | null) {
    const problem = validateFile(file, "video");
    setFileError(file ? problem : null);
    setVideo(problem ? null : file);
    setError(null);
  }

  if (!loading && session) {
    return (
      <div className="rounded-[22px] border border-line bg-paper-raised p-6 sm:p-7">
        <p className="text-[15px] leading-relaxed">{t("signedIn")}</p>
        <Link href="/new-analysis" className={buttonClasses("primary", "md", "mt-4")}>
          {t("signedInCta")}
        </Link>
      </div>
    );
  }

  return (
    <div>
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
        <Button className="min-h-12 w-full sm:w-auto sm:px-8" disabled={!video || busy} onClick={() => video && start(video)}>
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
