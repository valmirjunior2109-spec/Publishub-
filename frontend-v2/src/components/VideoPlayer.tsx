"use client";

import { forwardRef, type ReactNode } from "react";

interface VideoPlayerProps {
  src: string | null;
  fallback: string;
  /** Sobreposto no canto superior esquerdo (ex.: o badge "queda em 0:04"). */
  overlay?: ReactNode;
}

/** O Reel, vertical, com controles nativos. O `ref` permite pular para um segundo. */
export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer({ src, fallback, overlay }, ref) {
  return (
    <div className="relative w-full overflow-hidden rounded-md border border-line bg-ink">
      {src ? (
        <video ref={ref} src={src} controls playsInline preload="metadata" className="block max-h-[70vh] w-full bg-ink" />
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center p-6 text-center text-sm text-paper-raised">{fallback}</div>
      )}
      {overlay && <div className="pointer-events-none absolute left-4 top-4">{overlay}</div>}
    </div>
  );
});
