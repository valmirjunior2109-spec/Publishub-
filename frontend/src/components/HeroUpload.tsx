"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dropzone } from "@/components/Dropzone";
import { TypingPlaceholder } from "@/components/TypingPlaceholder";
import { Button } from "@/components/ui/Button";
import { MAX_VIDEO_BYTES, validateFile } from "@/lib/upload";
import { useGuestUpload } from "@/lib/useGuestUpload";

type FileErrorKey = "missing" | "type" | "empty" | "size";

function FilmGlyph() {
  return (
    <svg width="26" height="44" viewBox="0 0 26 44" aria-hidden="true">
      <rect x="1" y="1" width="24" height="42" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 16 L17 22 L11 28 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * A caixa do topo da landing: o teste grátis começa aqui, sem sair da página.
 *
 * É o mesmo envio de /experimentar (o hook é o mesmo), só que na primeira tela:
 * quem chegou pelo anúncio arrasta o Reel e vê a previsão, em vez de clicar num
 * botão para só então encontrar onde enviar.
 *
 * A linha que se escreve sozinha mostra o que as pessoas perguntam ao Publishub.
 * Ela some assim que um arquivo é escolhido — dali em diante o que importa é o
 * vídeo, não o convite.
 */
export function HeroUpload() {
  const t = useTranslations("Landing.upload");
  const tTry = useTranslations("Try");
  const { phase, busy, percent, error, setError, start, abort } = useGuestUpload();

  const [video, setVideo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<FileErrorKey | null>(null);
  const perguntas = useMemo(() => t.raw("examples") as string[], [t]);

  function pick(file: File | null) {
    const problem = validateFile(file, "video");
    setFileError(file ? problem : null);
    setVideo(problem ? null : file);
    setError(null);
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
        example={!video && !busy ? <TypingPlaceholder phrases={perguntas} active className="font-display text-[15px] italic leading-snug text-ink-muted" /> : null}
      />

      {busy && (
        <div className="mt-4 flex flex-col gap-2 text-sm" aria-live="polite">
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
        <p role="alert" className="mt-4 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
          {error}
        </p>
      )}

      {/* o botão só aparece depois do arquivo: antes disso a caixa inteira é o convite */}
      {video && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="min-h-12 w-full sm:w-auto sm:px-8" disabled={busy} onClick={() => start(video)}>
            {tTry("submit")}
          </Button>
          {phase === "uploading" && (
            <Button variant="ghost" className="min-h-12 w-full sm:w-auto" onClick={abort}>
              {tTry("cancel")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
