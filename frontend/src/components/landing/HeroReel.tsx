"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { HERO_REEL_POSTER, HERO_REEL_SRC } from "@/components/landing/heroReelMedia";
import { formatTimestamp } from "@/lib/format";

interface HeroReelProps {
  exampleLabel: string;
  /** O que o vídeo é, para leitor de tela. */
  label: string;
  soundOn: string;
  soundOff: string;
}

/**
 * O Reel da tela de análise da landing: o vídeo do fundador, editado com a
 * Publishub, rodando mudo e em loop, como um Reel no feed.
 *
 * O arquivo (2,8 MB) só é pedido quando o vídeo aparece na tela, e pausa quando
 * sai: a primeira dobra carrega a capa, não o vídeo. Quem pediu menos movimento
 * no sistema fica com a capa; o botão de som também dá o play.
 */
export function HeroReel({ exampleLabel, label, soundOn, soundOff }: HeroReelProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);

  function load(video: HTMLVideoElement) {
    if (!video.getAttribute("src")) video.setAttribute("src", HERO_REEL_SRC);
  }

  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          load(video);
          // o navegador pode recusar (economia de dados, aba em segundo plano): fica a capa
          video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    load(video);
    video.muted = !muted;
    setMuted(!muted);
    if (video.paused) video.play().catch(() => undefined);
  }

  const progress = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <>
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#1e1b18]">
        <video
          ref={ref}
          poster={HERO_REEL_POSTER}
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
          className="absolute inset-0 h-full w-full object-cover"
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-medium text-white">{exampleLabel}</span>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? soundOn : soundOff}
          title={muted ? soundOn : soundOff}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/70"
        >
          {muted ? <VolumeX size={16} strokeWidth={2} aria-hidden="true" /> : <Volume2 size={16} strokeWidth={2} aria-hidden="true" />}
        </button>
        {/* a barra do Reels, andando com o vídeo */}
        <span aria-hidden="true" className="absolute bottom-3 left-4 right-4 h-1 overflow-hidden rounded-full bg-white/35">
          <span className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[11.5px] text-ink-muted">
        <span>
          <span className="text-accent">{formatTimestamp(Math.floor(time))}</span> / {formatTimestamp(duration || 47)}
        </span>
        <span>9:16</span>
      </div>
    </>
  );
}
