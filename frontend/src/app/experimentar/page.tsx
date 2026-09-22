"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dropzone } from "@/components/Dropzone";
import { GuestShell } from "@/components/GuestShell";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/session";
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
 * A porta de entrada sem cadastro: só o vídeo. O Publishub aposta no segundo da
 * queda e a pessoa confere no Insights; o e-mail só é pedido para ver a análise
 * completa. Feita para o celular: uma coluna, um botão grande, nada mais.
 */
export default function TryPage() {
  const t = useTranslations("Try");
  const router = useRouter();
  const { session } = useSession();
  // o envio de convidado é o mesmo da caixa no topo da landing
  const { phase, busy, percent, error, setError, start, abort } = useGuestUpload();

  const [video, setVideo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<FileErrorKey | null>(null);

  // quem já tem conta não precisa do teste: vai direto para a análise completa
  useEffect(() => {
    if (session) router.replace("/nova-analise");
  }, [session, router]);

  function pick(file: File | null) {
    const problem = validateFile(file, "video");
    setFileError(file ? problem : null);
    setVideo(problem ? null : file);
    setError(null);
  }

  return (
    <GuestShell>
      <main className="mx-auto max-w-[620px] px-5 pb-24 pt-8 lg:pt-14">
        <div className="stagger">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">{t("title")}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </div>

        <div className="mt-8">
          <Dropzone
            file={video}
            onPick={pick}
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            prompt={t("drop")}
            hint={t("hint", { mb: MAX_VIDEO_BYTES / 1024 / 1024 })}
            changeLabel={t("change")}
            disabled={busy}
            error={fileError ? t(`errors.${fileError}`) : null}
            glyph={<FilmGlyph />}
          />
        </div>

        {busy && (
          <div className="mt-6 flex flex-col gap-2 text-sm" aria-live="polite">
            <div className="flex items-center justify-between">
              <span>{phase === "registering" ? t("progress.registering") : t("progress.uploading")}</span>
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
          <p role="alert" className="mt-6 rounded-sm border border-refuted bg-paper-raised p-3 text-sm text-refuted">
            {error}
          </p>
        )}

        {/* mobile primeiro: o botão ocupa a largura toda e tem alvo de toque grande */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="min-h-12 w-full sm:w-auto sm:px-8" disabled={!video || busy} onClick={() => video && start(video)}>
            {t("submit")}
          </Button>
          {phase === "uploading" && (
            <Button variant="ghost" className="min-h-12 w-full sm:w-auto" onClick={abort}>
              {t("cancel")}
            </Button>
          )}
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">{t("noAccount")}</p>

        <ol className="mt-10 flex flex-col border-t border-line">
          {(["1", "2", "3"] as const).map((n) => (
            <li key={n} className="flex gap-4 border-b border-line py-4 text-[14.5px] leading-relaxed">
              <span className="font-display text-[13px] text-ink-muted">0{n}</span>
              <span>{t(`steps.${n}`)}</span>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-[13px] text-ink-muted">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-2 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </main>
    </GuestShell>
  );
}
