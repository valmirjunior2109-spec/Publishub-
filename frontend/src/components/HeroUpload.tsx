"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Film, Paperclip, X } from "lucide-react";
import { TypingPlaceholder } from "@/components/TypingPlaceholder";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MAX_VIDEO_BYTES, validateFile } from "@/lib/upload";
import { useGuestUpload } from "@/lib/useGuestUpload";

type FileErrorKey = "missing" | "type" | "empty" | "size";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb.toFixed(1)} MB`;
}

/**
 * O começo da conversa: uma caixa de mensagem onde o anexo é o Reel.
 *
 * A pergunta se escreve sozinha enquanto ninguém mexe — é o que as pessoas
 * pedem ao Publishub. Clicar em qualquer lugar (ou arrastar o arquivo para cá)
 * anexa o vídeo; o botão redondo envia, e a resposta é a análise.
 *
 * O envio é o mesmo de /experimentar, pelo hook compartilhado: aqui muda só
 * onde a conversa começa.
 */
export function HeroUpload() {
  const t = useTranslations("Landing.upload");
  const tHero = useTranslations("Landing.hero"); // o CTA e a nota são do topo
  const tTry = useTranslations("Try");
  const { phase, busy, percent, error, setError, start, abort } = useGuestUpload();

  const inputRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<FileErrorKey | null>(null);
  const [dragging, setDragging] = useState(false);
  const perguntas = useMemo(() => t.raw("examples") as string[], [t]);

  function pick(file: File | null) {
    const problem = validateFile(file, "video");
    setFileError(file ? problem : null);
    setVideo(problem ? null : file);
    setError(null);
  }

  function act() {
    if (busy) return;
    if (video) start(video);
    else inputRef.current?.click();
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pick(event.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "rounded-md border bg-paper-raised p-4 transition-[border-color,box-shadow,transform] duration-200 sm:p-5",
        dragging ? "border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.12)]" : "border-line",
      )}
    >
      {/* a linha de cima: a pergunta se escrevendo, ou o arquivo já anexado */}
      {video ? (
        <div className="flex items-center gap-3 rounded-sm bg-paper px-3 py-2.5">
          <Film size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{video.name}</span>
            <span className="block text-[12px] text-ink-muted">{formatBytes(video.size)}</span>
          </span>
          {!busy && (
            <button type="button" onClick={() => pick(null)} aria-label={tTry("change")} className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink">
              <X size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={act} disabled={busy} className="block w-full cursor-text text-left">
          <span className="block min-h-[3.5em] font-display text-[17px] leading-snug tracking-[-0.01em] text-ink-muted sm:text-[19px]">
            {dragging ? t("dropping") : <TypingPlaceholder phrases={perguntas} active={!busy} />}
          </span>
        </button>
      )}

      {/* o rodapé: o que anexar, e o botão que envia */}
      <div className="mt-3 flex items-end justify-between gap-4">
        <button
          type="button"
          onClick={() => !busy && inputRef.current?.click()}
          disabled={busy}
          className="group flex min-w-0 items-center gap-2 text-left text-[12.5px] leading-snug text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          <Paperclip size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0">
            <span className="block font-medium">{t("attach")}</span>
            <span className="block">{t("hint", { mb: MAX_VIDEO_BYTES / 1024 / 1024 })}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={act}
          disabled={busy}
          aria-label={video ? tTry("submit") : t("attach")}
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-[background-color,transform,opacity] duration-200 active:scale-95",
            video ? "bg-accent text-paper-raised hover:bg-accent-strong" : "bg-ink text-paper hover:opacity-90",
            busy && "opacity-60",
          )}
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowUp size={18} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      {busy && (
        <div className="mt-4 flex flex-col gap-2 text-[13px]" aria-live="polite">
          <div className="flex items-center justify-between">
            <span>{phase === "registering" ? tTry("progress.registering") : tTry("progress.uploading")}</span>
            <span className="flex items-center gap-3">
              {phase === "uploading" && <span className="font-display tabular-nums text-ink-muted">{percent}%</span>}
              {phase === "uploading" && (
                <button type="button" onClick={abort} className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                  {tTry("cancel")}
                </button>
              )}
            </span>
          </div>
          {phase === "uploading" && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      )}

      {(fileError || error) && (
        <p role="alert" className="mt-3 text-[13px] text-refuted">
          {fileError ? tTry(`errors.${fileError}`) : error}
        </p>
      )}

      {/* o CTA com nome: a mesma ação do botão redondo, dita em palavras */}
      {!busy && (
        <div className="mt-4 border-t border-line pt-4">
          <Button className="min-h-12 w-full px-6 sm:w-auto" onClick={act}>
            {video ? tTry("submit") : tHero("cta")}
          </Button>
          <p className="mt-2.5 text-[12.5px] text-ink-muted">{tHero("ctaNote")}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          pick(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </div>
  );
}
