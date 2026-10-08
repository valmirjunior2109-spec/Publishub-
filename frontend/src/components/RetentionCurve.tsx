import { formatTimestamp } from "@/lib/format";
import type { CurvePoint } from "@/lib/types";

export type CurveVariant = "full" | "medium" | "mini" | "divider";

interface RetentionCurveProps {
  /** [segundo, % assistindo], em ordem de tempo — o formato que a API devolve */
  points: CurvePoint[];
  durationSec: number;
  dropAtSec: number;
  /** full: gráfico com eixos · medium: 320×96 · mini: 40×16 · divider: linha entre seções */
  variant?: CurveVariant;
  /** Só a variante full usa rótulos. */
  labels?: { watching: string; drop: string };
  /** Tamanho dos rótulos dos eixos, em unidades do desenho (960 de largura). Maior quando a curva aparece pequena. */
  axisSize?: number;
  className?: string;
}

/* Geometria do design no Figma: viewBox 960×280, 100% em y=20 e 0% em y=258. */
const W = 960;
const H = 280;
const TOP = 20;
const BOTTOM = 258;

/** Catmull-Rom → Bézier cúbica: curva suave passando por todos os pontos. */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * A curva de retenção, em SVG, a partir dos pontos lidos do print: um traço
 * limpo, sem tremido, e o marcador da queda no azul da caneta.
 */
export function RetentionCurve({ points, durationSec, dropAtSec, variant = "full", labels, axisSize = 11, className }: RetentionCurveProps) {
  const x = (t: number) => (t / Math.max(durationSec, 1)) * W;
  const y = (retained: number) => TOP + (1 - retained / 100) * (BOTTOM - TOP);

  const coords: Array<[number, number]> = points.map((p) => [x(p[0]), y(p[1])]);
  const line = smoothPath(coords);
  const area = `${line} L ${W},${BOTTOM} L 0,${BOTTOM} Z`;

  // o ponto lido mais perto do segundo da queda (a leitura do print é amostrada)
  const dropPoint = points.reduce((best, p) => (Math.abs(p[0] - dropAtSec) < Math.abs(best[0] - dropAtSec) ? p : best), points[0]);
  const dropX = x(dropAtSec);
  const dropY = y(dropPoint[1]);
  const dropLabel = formatTimestamp(dropAtSec);

  if (variant === "mini") {
    return (
      <svg width={40} height={16} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
        <path d={line} stroke="var(--ink-muted)" strokeWidth="22" fill="none" strokeLinecap="round" />
        <circle cx={dropX} cy={dropY} r="32" fill="var(--accent)" />
      </svg>
    );
  }

  if (variant === "medium") {
    return (
      <svg width={320} height={96} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} role="img" aria-label={dropLabel}>
        <path d={area} fill="var(--line)" opacity="0.25" />
        <path d={line} stroke="var(--ink)" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={dropX} cy={dropY} r="20" fill="var(--accent)" />
      </svg>
    );
  }

  if (variant === "divider") {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className ?? "block h-12 w-full"} aria-hidden="true">
        <path d={line} pathLength={1} data-line stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line data-guide x1={dropX} x2={dropX} y1={dropY + 14} y2={BOTTOM} stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 4" opacity="0.65" vectorEffect="non-scaling-stroke" />
        <circle data-marker cx={dropX} cy={dropY} r="4" fill="var(--accent)" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  const mid = Math.round(durationSec / 2);
  return (
    <div className={className} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={labels ? `${labels.drop} ${dropLabel}` : dropLabel}>
        {[75, 50, 25].map((v) => (
          <line key={v} x1={axisSize * 3.4} y1={y(v)} x2={W} y2={y(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="4 5" opacity="0.7" />
        ))}
        <path d={area} fill="rgba(var(--accent-rgb), 0.06)" />
        <path d={line} pathLength={1} data-line stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* marcador da queda */}
        <line data-guide x1={dropX} y1={dropY + 14} x2={dropX} y2={BOTTOM} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.65" />
        <circle data-ring cx={dropX} cy={dropY} r="13" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.25" />
        <circle data-marker cx={dropX} cy={dropY} r="7" fill="var(--accent)" />

        {/* eixo y */}
        {[75, 50, 25].map((v) => (
          <text key={v} x="2" y={y(v) + axisSize * 0.35} fill="var(--ink-muted)" fontSize={axisSize} fontFamily="var(--font-mono)">
            {v}%
          </text>
        ))}

        {/* eixo x: o 0:00 sai quando encostaria no rótulo da queda (uma queda logo no começo, rótulos grandes) */}
        {dropX > axisSize * 4.8 && (
          <text x="2" y="274" fill="var(--ink-muted)" fontSize={axisSize} fontFamily="var(--font-mono)">
            {formatTimestamp(0)}
          </text>
        )}
        <text x={dropX} y="274" textAnchor="middle" fill="var(--accent)" fontSize={axisSize} fontWeight="500" fontFamily="var(--font-mono)">
          {dropLabel}
        </text>
        {mid > 0 && Math.abs(x(mid) - dropX) > 60 && (
          <text x={x(mid)} y="274" textAnchor="middle" fill="var(--ink-muted)" fontSize={axisSize} fontFamily="var(--font-mono)">
            {formatTimestamp(mid)}
          </text>
        )}
        <text x={W - 2} y="274" textAnchor="end" fill="var(--ink-muted)" fontSize={axisSize} fontFamily="var(--font-mono)">
          {formatTimestamp(durationSec)}
        </text>
      </svg>
    </div>
  );
}
