"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { track } from "@/lib/events";

interface ShareVideoButtonProps {
  /** O link assinado do vídeo editado (vale 1 hora). */
  url: string;
  /** Com que nome o arquivo chega no Instagram, TikTok ou WhatsApp. */
  fileName: string;
  analysisId: string;
  /** A versão do vídeo editado: cada versão nova é um arquivo novo. */
  revision: number;
  /** Compartilhou de verdade (não só abriu e desistiu). */
  onShared?: () => void;
}

type State = "checking" | "unsupported" | "preparing" | "ready" | "failed";

/* O navegador consegue compartilhar um arquivo de vídeo? Perguntado com um arquivo vazio. */
function canShareVideo(): boolean {
  try {
    return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([], "video.mp4", { type: "video/mp4" })] });
  } catch {
    return false;
  }
}

/**
 * "Compartilhar vídeo": abre o compartilhar do próprio celular com o ARQUIVO do
 * vídeo editado, para ele ir direto ao Instagram, TikTok, WhatsApp…
 *
 * O arquivo é baixado assim que o vídeo fica pronto, não no toque: o Safari do
 * iPhone só abre o compartilhar se ele for chamado na hora do toque, e um
 * download de vários MB no meio faz o navegador recusar.
 *
 * Onde o navegador não compartilha arquivos (boa parte dos computadores), fica a
 * dica de baixar e publicar pela galeria, em vez de um botão que não funciona.
 */
export function ShareVideoButton({ url, fileName, analysisId, revision, onShared }: ShareVideoButtonProps) {
  const t = useTranslations("Analysis.cuts.share");
  const [state, setState] = useState<State>("checking");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let alive = true;
    if (!canShareVideo()) {
      // decidido depois da hidratação: o servidor não sabe o que o navegador faz
      queueMicrotask(() => alive && setState("unsupported"));
      return () => {
        alive = false;
      };
    }
    queueMicrotask(() => alive && setState("preparing"));
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      })
      .then((blob) => {
        if (!alive) return;
        setFile(new File([blob], fileName, { type: "video/mp4" }));
        setState("ready");
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
    // o mesmo vídeo (mesma versão) não é baixado de novo quando o link assinado muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, fileName]);

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file] });
      track("video_shared", analysisId, { result: "shared", revision });
      onShared?.();
    } catch (error) {
      // fechar a tela de compartilhar não é erro: a pessoa desistiu
      const cancelled = error instanceof DOMException && error.name === "AbortError";
      track("video_shared", analysisId, { result: cancelled ? "cancelled" : "failed", revision });
      if (!cancelled) setState("failed");
    }
  }

  if (state === "checking") return null;

  if (state === "unsupported" || state === "failed") {
    return <p className="basis-full text-[12.5px] leading-relaxed text-ink-muted">{t(state === "failed" ? "failed" : "hint")}</p>;
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={state !== "ready"}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-transparent bg-accent px-4 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-60"
    >
      {state === "preparing" ? (
        <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border border-paper-raised border-t-transparent" />
      ) : (
        <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
      {state === "preparing" ? t("preparing") : t("cta")}
    </button>
  );
}
