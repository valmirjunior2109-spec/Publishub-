"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { capture, identify } from "./analytics";
import { apiFetch, ApiError } from "./api";
import { track } from "./events";
import { readGuestToken, saveGuestToken } from "./guest";
import { resolveType, resumingAfterBackground, UploadError, uploadToSignedUrl, type UploadHandle } from "./upload";
import { useErrorText } from "./useErrorText";
import { useLeaveGuard } from "./useLeaveGuard";
import type { Analysis } from "./types";

export type GuestPhase = "idle" | "uploading" | "registering";

/**
 * O teste sem cadastro, do arquivo escolhido até a página do resultado.
 * `destination` muda a página para onde ir com a análise criada (a auditoria grátis
 * abre o relatório dela, não o resultado de sempre). `onFailure` recebe só o
 * código do erro (para a medição), nunca a mensagem.
 *
 * Três passos: abrir a sessão de convidado (uma por navegador), pedir ao backend
 * uma URL assinada — convidado não tem pasta no bucket — e registrar o vídeo.
 * Mora aqui porque começa em dois lugares: na caixa do topo da landing e na
 * página /try.
 */
const toResults = (analysisId: string) => `/results/${analysisId}`;

export function useGuestUpload({ destination = toResults, onFailure }: { destination?: (analysisId: string) => string; onFailure?: (code: string) => void } = {}) {
  const t = useTranslations("Try");
  const tErrors = useTranslations("Errors");
  const errorText = useErrorText();
  const locale = useLocale();
  const router = useRouter();

  const uploadRef = useRef<UploadHandle | null>(null);
  const [phase, setPhase] = useState<GuestPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // a análise que este navegador já começou: quem saiu da página no meio volta por
  // aqui e precisa achar a análise, não bater no limite do teste grátis
  const [previousId, setPreviousId] = useState<string | null>(null);

  useEffect(() => {
    if (!readGuestToken()) return;
    let alive = true;
    // a que falhou não gasta o teste: quem voltou pode mandar outro vídeo
    apiFetch<{ analyses: { id: string; status: Analysis["status"] }[] }>("/api/guest/analyses")
      .then(({ analyses }) => alive && setPreviousId(analyses.find((a) => a.status !== "failed")?.id ?? null))
      .catch(() => {}); // sem a lista o envio segue normal; o limite, se houver, aparece no erro
    return () => {
      alive = false;
    };
  }, []);

  useLeaveGuard(phase !== "idle");

  const start = useCallback(
    async (video: File) => {
      setError(null);
      try {
        track("video_upload_started", null, { size_mb: Math.round((video.size / 1024 / 1024) * 10) / 10, guest: true });
        // a análise ainda não existe: analysis_id vai nulo, e o id aparece nos eventos seguintes
        capture("upload_started", null, locale, { guest: true });
        // 1. a sessão de convidado (uma por navegador) — o token identifica o teste
        let token = readGuestToken();
        if (!token) {
          const guestSession = await apiFetch<{ token: string; id: string }>("/api/guest/session", { method: "POST" });
          token = guestSession.token;
          saveGuestToken(token);
          // o mesmo id que o backend usa nos eventos do servidor para quem não tem conta
          identify(`guest:${guestSession.id}`);
        }

        // 2. o backend assina o envio: o convidado não tem pasta no bucket
        // se o celular derrubar o envio ao trocar de app, recomeça com uma URL nova quando a página volta
        setPhase("uploading");
        setProgress(0);
        const target = await resumingAfterBackground(
          async () => {
            const signed = await apiFetch<{ url: string; path: string }>("/api/guest/upload-url", {
              method: "POST",
              body: { content_type: resolveType(video) },
            });
            uploadRef.current = uploadToSignedUrl({ file: video, url: signed.url, onProgress: setProgress });
            await uploadRef.current.promise;
            return signed;
          },
          () => setProgress(0),
        );

        // 3. registra e começa a análise; a previsão aparece na página do resultado
        setPhase("registering");
        const created = await apiFetch<{ analysis: Analysis }>("/api/videos", {
          method: "POST",
          body: { storage_path: target.path, filename: video.name, ui_locale: locale },
        });
        track("video_upload_completed", created.analysis.id, { guest: true });
        router.push(destination(created.analysis.id));
      } catch (err) {
        if (err instanceof UploadError) setError(t(`errors.${err.reason}`));
        else if (err instanceof ApiError) setError(errorText(err));
        else setError(tErrors("generic"));
        onFailure?.(err instanceof UploadError ? `UPLOAD_${err.reason.toUpperCase()}` : err instanceof ApiError ? err.code : "UNKNOWN");
        setPhase("idle");
      }
    },
    [destination, errorText, locale, onFailure, router, t, tErrors],
  );

  const abort = useCallback(() => uploadRef.current?.abort(), []);

  return {
    phase,
    busy: phase !== "idle",
    percent: Math.round(progress * 100),
    error,
    setError,
    previousId,
    start,
    abort,
  };
}
