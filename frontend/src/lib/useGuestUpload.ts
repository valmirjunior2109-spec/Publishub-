"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, ApiError } from "./api";
import { track } from "./events";
import { readGuestToken, saveGuestToken } from "./guest";
import { resolveType, UploadError, uploadToSignedUrl, type UploadHandle } from "./upload";
import { useErrorText } from "./useErrorText";
import type { Analysis } from "./types";

export type GuestPhase = "idle" | "uploading" | "registering";

/**
 * O teste sem cadastro, do arquivo escolhido até a página do resultado.
 *
 * Três passos: abrir a sessão de convidado (uma por navegador), pedir ao backend
 * uma URL assinada — convidado não tem pasta no bucket — e registrar o vídeo.
 * Mora aqui porque começa em dois lugares: na caixa do topo da landing e na
 * página /experimentar.
 */
export function useGuestUpload() {
  const t = useTranslations("Try");
  const tErrors = useTranslations("Errors");
  const errorText = useErrorText();
  const locale = useLocale();
  const router = useRouter();

  const uploadRef = useRef<UploadHandle | null>(null);
  const [phase, setPhase] = useState<GuestPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (video: File) => {
      setError(null);
      try {
        track("video_upload_started", null, { size_mb: Math.round((video.size / 1024 / 1024) * 10) / 10, guest: true });
        // 1. a sessão de convidado (uma por navegador) — o token identifica o teste
        let token = readGuestToken();
        if (!token) {
          token = (await apiFetch<{ token: string }>("/api/guest/session", { method: "POST" })).token;
          saveGuestToken(token);
        }

        // 2. o backend assina o envio: o convidado não tem pasta no bucket
        setPhase("uploading");
        setProgress(0);
        const target = await apiFetch<{ url: string; path: string }>("/api/guest/upload-url", {
          method: "POST",
          body: { content_type: resolveType(video) },
        });
        uploadRef.current = uploadToSignedUrl({ file: video, url: target.url, onProgress: setProgress });
        await uploadRef.current.promise;

        // 3. registra e começa a análise; a previsão aparece na página do resultado
        setPhase("registering");
        const created = await apiFetch<{ analysis: Analysis }>("/api/videos", {
          method: "POST",
          body: { storage_path: target.path, filename: video.name, ui_locale: locale },
        });
        track("video_upload_completed", created.analysis.id, { guest: true });
        router.push(`/results/${created.analysis.id}`);
      } catch (err) {
        if (err instanceof UploadError) setError(t(`errors.${err.reason}`));
        else if (err instanceof ApiError) setError(errorText(err));
        else setError(tErrors("generic"));
        setPhase("idle");
      }
    },
    [errorText, locale, router, t, tErrors],
  );

  const abort = useCallback(() => uploadRef.current?.abort(), []);

  return {
    phase,
    busy: phase !== "idle",
    percent: Math.round(progress * 100),
    error,
    setError,
    start,
    abort,
  };
}
