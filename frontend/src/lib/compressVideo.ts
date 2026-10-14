"use client";

/**
 * Vídeo acima do limite do bucket (50 MB no plano grátis do Supabase): em vez de
 * recusar, o próprio navegador recodifica para um MP4 que cabe. É o caso comum do
 * celular: um Reel de 1 minuto gravado pela câmera passa fácil de 100 MB.
 *
 * WebCodecs (VideoDecoder/VideoEncoder), via mediabunny, carregado só quando um
 * vídeo grande aparece: quem envia um arquivo pequeno não baixa nada disso.
 *
 * O resultado precisa servir ao backend como o original serviria:
 *   - MP4 de verdade, com a duração no cabeçalho (o probe do ffmpeg recusa
 *     "Duration: N/A", que é o que o MediaRecorder entrega em WebM);
 *   - o áudio inteiro: a análise começa pela fala. Sem conseguir manter o áudio,
 *     a compressão falha em vez de mandar um vídeo mudo.
 * O arquivo original da pessoa não muda: sai uma cópia nova, só na memória.
 */

export type CompressFailure = "unsupported" | "too_long" | "failed" | "aborted";

export class CompressError extends Error {
  reason: CompressFailure;
  constructor(reason: CompressFailure, detail?: string) {
    super(detail ?? reason);
    this.reason = reason;
  }
}

export interface CompressHandle {
  promise: Promise<File>;
  abort: () => void;
}

/** Folga para o cabeçalho do MP4 e para o encoder passar um pouco do alvo. */
const SAFETY = 0.85;
/** Reservado para o áudio quando não dá para medir (o AAC do celular fica entre 64 e 256 kbps). */
const AUDIO_BPS = 256_000;
/** Acima disso não melhora nada que a análise veja. */
const MAX_VIDEO_BPS = 6_000_000;
/** Abaixo disso a imagem fica ruim demais até para ler as legendas: melhor pedir um trecho mais curto. */
const MIN_VIDEO_BPS = 400_000;

/** O navegador tem o que a compressão precisa? (navegadores antigos e alguns embutidos em apps não têm) */
export function canCompressVideo(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

/** "IMG_1234.MOV" → "IMG_1234.mp4": o nome continua reconhecível no painel. */
function mp4Name(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "video";
  return `${base}.mp4`;
}

export function compressVideo(file: File, maxBytes: number, onProgress?: (fraction: number) => void): CompressHandle {
  let cancel: (() => Promise<void>) | null = null;
  let aborted = false;

  const promise = (async () => {
    const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) throw new CompressError("failed", "no video track");
      const audioTrack = await input.getPrimaryAudioTrack();
      const duration = await input.computeDuration();
      if (!(duration > 0)) throw new CompressError("failed", "no duration");

      // quanto cabe por segundo, já descontado o áudio (o AAC é copiado: vale a taxa medida no próprio arquivo)
      let audioBps = audioTrack ? AUDIO_BPS : 0;
      if (audioTrack && (await audioTrack.getCodec()) === "aac") {
        const measured = await audioTrack.computePacketStats().then((stats) => stats.averageBitrate, () => 0);
        if (measured > 0) audioBps = Math.min(AUDIO_BPS * 2, measured * 1.05);
      }
      const videoBps = Math.min(MAX_VIDEO_BPS, (maxBytes * SAFETY * 8) / duration - audioBps);
      if (videoBps < MIN_VIDEO_BPS) throw new CompressError("too_long");

      // o lado menor em 1080 px (ou 720 px quando a taxa aperta): o vertical do Reel continua vertical
      const width = await videoTrack.getDisplayWidth();
      const height = await videoTrack.getDisplayHeight();
      const shortSide = videoBps >= 2_500_000 ? 1080 : 720;
      const size = Math.min(width, height) <= shortSide ? {} : width <= height ? { width: shortSide } : { height: shortSide };

      const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
      const conversion = await Conversion.init({
        input,
        output,
        tracks: "primary",
        video: { ...size, codec: "avc", quality: new Quality({ bitrate: Math.round(videoBps) }), forceTranscode: true },
        audio: { codec: "aac" },
        showWarnings: false,
      });
      // sem como gravar a imagem ou o áudio neste navegador: não adianta seguir
      const lost = conversion.discardedTracks.filter((discarded) => discarded.track === videoTrack || discarded.track === audioTrack);
      if (!conversion.isValid || lost.length > 0) throw new CompressError("unsupported", lost.map((d) => d.reason).join(","));

      cancel = () => conversion.cancel();
      if (aborted) throw new CompressError("aborted");
      conversion.onProgress = (fraction) => onProgress?.(fraction);
      await conversion.execute();

      const buffer = output.target.buffer;
      if (!buffer) throw new CompressError("failed", "empty output");
      if (buffer.byteLength > maxBytes) throw new CompressError("too_long");
      return new File([buffer], mp4Name(file.name), { type: "video/mp4", lastModified: Date.now() });
    } catch (err) {
      if (err instanceof CompressError) throw err;
      if (aborted) throw new CompressError("aborted");
      // decoder do formato ausente (HEVC num aparelho sem suporte, por exemplo) ou o encoder falhou no meio
      throw new CompressError("unsupported", err instanceof Error ? err.message : String(err));
    } finally {
      input.dispose();
    }
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      void cancel?.();
    },
  };
}
