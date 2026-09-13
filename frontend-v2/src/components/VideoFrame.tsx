import { Play } from "lucide-react";
import { formatTimestamp } from "@/lib/format";

interface VideoFrameProps {
  title: string;
  durationSec: number;
  dropAtSec: number;
  labels: {
    preview: string;
    drop: string;
  };
}

/**
 * Player vertical 9:16. Nesta etapa é uma moldura estática — sem arquivo de
 * vídeo, os controles não tocam nada. Vira <video> quando o upload existir.
 */
export function VideoFrame({ title, durationSec, dropAtSec, labels }: VideoFrameProps) {
  const dropPercent = (dropAtSec / durationSec) * 100;

  return (
    <div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-md border border-line bg-ink text-paper-raised"
      role="img"
      aria-label={`${labels.preview}: ${title}`}
    >
      {/* luz suave no centro, para não ser um retângulo chapado */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 50% 35%, rgba(255,253,248,0.09), transparent 62%)" }}
      />

      <p className="absolute left-4 right-4 top-4 truncate text-xs opacity-80">{title}</p>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-paper-raised opacity-70">
          <Play size={20} strokeWidth={1.5} className="ml-0.5" aria-hidden="true" />
        </span>
      </div>

      <div className="absolute inset-x-4 bottom-4">
        <div className="relative h-px">
          <span aria-hidden="true" className="absolute inset-0 bg-paper-raised opacity-30" />
          <span aria-hidden="true" className="absolute left-0 top-0 h-px bg-paper-raised" style={{ width: `${dropPercent}%` }} />
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-ink"
            style={{ left: `${dropPercent}%` }}
            title={`${labels.drop} ${formatTimestamp(dropAtSec)}`}
          />
        </div>
        <div className="mt-2 flex justify-between font-display text-[13px] tabular-nums opacity-80">
          <span>{formatTimestamp(dropAtSec)}</span>
          <span>{formatTimestamp(durationSec)}</span>
        </div>
      </div>
    </div>
  );
}
