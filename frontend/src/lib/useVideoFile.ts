"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { capture } from "./analytics";
import { canCompressVideo, compressVideo, CompressError, type CompressHandle } from "./compressVideo";
import { checkVideo, MAX_VIDEO_BYTES, type VideoProblem } from "./upload";

const LIMIT_MB = MAX_VIDEO_BYTES / 1024 / 1024;

function sizeMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

/** A extensão, só para o diagnóstico: o nome do arquivo não sai do navegador. */
function extensionOf(name: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1].toLowerCase() : "none";
}

/**
 * O vídeo escolhido nas telas de envio (/try e /new-analysis): confere o tipo
 * (pelo conteúdo, se preciso), diz se vai precisar comprimir e, no envio, comprime.
 *
 * Toda recusa vira um `upload_rejected` no PostHog, com o motivo, o tamanho, o
 * tipo e a extensão: foi a falta disso que deixou "não consigo anexar o vídeo"
 * sem diagnóstico.
 */
export function useVideoFile() {
  const locale = useLocale();
  const t = useTranslations("Upload");
  const [video, setVideo] = useState<File | null>(null);
  const [problem, setProblem] = useState<VideoProblem | null>(null);
  const [needsCompression, setNeedsCompression] = useState(false);
  const [pickedBytes, setPickedBytes] = useState(0);

  const pick = useCallback(
    async (file: File | null) => {
      if (!file) {
        setVideo(null);
        setProblem(null);
        setNeedsCompression(false);
        return;
      }
      const checked = await checkVideo(file, canCompressVideo());
      if (checked.problem) {
        capture("upload_rejected", null, locale, { reason: checked.problem, size_mb: sizeMb(file.size), mime: file.type || "none", ext: extensionOf(file.name), can_compress: canCompressVideo() });
      }
      setPickedBytes(file.size);
      setProblem(checked.problem);
      setVideo(checked.file);
      setNeedsCompression(checked.needsCompression);
    },
    [locale],
  );

  /** O texto da recusa. `fallback` é a mensagem que a tela já tinha para os outros motivos. */
  const problemText = (fallback: (key: VideoProblem) => string): string | null => {
    if (!problem) return null;
    // grande demais e sem como comprimir aqui: diz o tamanho e onde dá para comprimir
    if (problem === "size") return t("tooBig", { size: Math.round(pickedBytes / 1024 / 1024), mb: LIMIT_MB });
    return fallback(problem);
  };

  /** O aviso abaixo do arquivo quando ele vai ser comprimido antes do envio. */
  const compressNote = needsCompression && video ? t("compressNote", { size: Math.round(video.size / 1024 / 1024), mb: LIMIT_MB }) : null;

  /**
   * O arquivo que sobe: o próprio vídeo ou, acima do limite, a cópia comprimida.
   * `onStart` recebe o handle para o botão de cancelar.
   */
  const prepare = useCallback(
    async (file: File, onProgress: (fraction: number) => void, onStart: (handle: CompressHandle) => void): Promise<File> => {
      if (!needsCompression) return file;
      const started = Date.now();
      const handle = compressVideo(file, MAX_VIDEO_BYTES, onProgress);
      onStart(handle);
      try {
        const compressed = await handle.promise;
        capture("video_compressed", null, locale, { from_mb: sizeMb(file.size), to_mb: sizeMb(compressed.size), seconds: Math.round((Date.now() - started) / 1000) });
        return compressed;
      } catch (err) {
        const reason = err instanceof CompressError ? err.reason : "failed";
        if (reason !== "aborted") {
          capture("upload_rejected", null, locale, { reason: `compress_${reason}`, size_mb: sizeMb(file.size), mime: file.type || "none", ext: extensionOf(file.name), detail: err instanceof Error ? err.message.slice(0, 120) : null });
        }
        throw err;
      }
    },
    [locale, needsCompression],
  );

  /** O texto de uma falha da compressão (null para cancelamento, que a tela trata como quiser). */
  const compressErrorText = (err: unknown): string | null => {
    if (!(err instanceof CompressError) || err.reason === "aborted") return null;
    return err.reason === "too_long" ? t("tooLong", { mb: LIMIT_MB }) : t("unsupported", { mb: LIMIT_MB });
  };

  return { video, problem, needsCompression, pick, problemText, compressNote, prepare, compressErrorText, compressingLabel: t("compressing") };
}
