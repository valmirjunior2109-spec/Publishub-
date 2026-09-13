import type { RetentionPoint } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";

interface RetentionCurveProps {
  points: RetentionPoint[];
  durationSec: number;
  dropAtSec: number;
  labels: {
    watching: string;
    drop: string;
  };
}

/* viewBox pequeno de propósito: o card tem ~300px, então 1 unidade ≈ 1px e o
   texto sai no tamanho em que foi desenhado. */
const W = 320;
const H = 200;
const PAD = { top: 30, right: 12, bottom: 24, left: 34 };

/** Ruído determinístico em [-1, 1] para o traço não sair perfeitamente liso. */
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Catmull-Rom → Bézier cúbica: curva suave passando por todos os pontos. */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Curva de retenção desenhada à mão em SVG. Sem biblioteca de gráfico: o
 * traço tem um leve tremor e o marcador da queda é o único elemento em accent.
 */
export function RetentionCurve({ points, durationSec, dropAtSec, labels }: RetentionCurveProps) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + (t / durationSec) * innerW;
  const y = (retained: number) => PAD.top + (1 - retained / 100) * innerH;

  const coords: Array<[number, number]> = points.map((p, i) => [x(p.t) + jitter(i) * 0.8, y(p.retained) + jitter(i + 100) * 1.4]);
  const line = smoothPath(coords);
  const area = `${line} L ${x(durationSec).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`;

  const dropPoint = points.find((p) => p.t === dropAtSec) ?? points[0];
  const dropX = x(dropAtSec);
  const dropY = y(dropPoint.retained);

  const midT = Math.round(durationSec / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${labels.drop} ${formatTimestamp(dropAtSec)}`}>
      {/* linhas-guia: 50% tracejada, base sólida */}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(50)} y2={y(50)} stroke="var(--line)" strokeDasharray="2 5" />
      <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--line)" />

      {/* eixo y */}
      {[100, 50, 0].map((v) => (
        <text key={v} x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-sans)">
          {v}%
        </text>
      ))}

      {/* eixo x */}
      {[0, midT, durationSec].map((t) => (
        <text key={t} x={x(t)} y={H - 8} textAnchor={t === 0 ? "start" : t === durationSec ? "end" : "middle"} fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-sans)">
          {formatTimestamp(t)}
        </text>
      ))}

      {/* área sob a curva e o traço em si */}
      <path d={area} fill="var(--line)" opacity="0.32" />
      <path d={line} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* marcador da queda */}
      <line x1={dropX} x2={dropX} y1={PAD.top - 6} y2={y(0)} stroke="var(--accent)" strokeDasharray="3 4" />
      <circle cx={dropX} cy={dropY} r="6" fill="var(--accent)" stroke="var(--paper-raised)" strokeWidth="2" />
      <text
        x={dropX + 10}
        y={PAD.top + 2}
        fontSize="16"
        fontWeight="700"
        fill="var(--accent)"
        fontFamily="var(--font-display)"
        style={{ fontOpticalSizing: "auto" }}
      >
        {formatTimestamp(dropAtSec)}
      </text>
      <text x={dropX + 10} y={PAD.top + 16} fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-sans)">
        {Math.round(dropPoint.retained)}% {labels.watching}
      </text>
    </svg>
  );
}
