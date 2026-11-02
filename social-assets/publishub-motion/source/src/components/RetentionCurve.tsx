import { C, FONT, type Point } from "../theme";

/* A curva de retenção de frontend/src/components/RetentionCurve.tsx (variante
   full), com a animação por quadro: `draw` desenha o traço, `pop` acende o
   marcador da queda, `ring` (0 → 1) expande o anel uma vez. */
const W = 960;
const H = 280;
const TOP = 20;
const BOTTOM = 258;

function smoothPath(pts: Array<[number, number]>): string {
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

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

export function RetentionCurve({
  points,
  durationSec,
  dropAtSec,
  axisSize = 20,
  draw = 1,
  pop = 1,
  ring = 0,
  id = "curve",
}: {
  points: Point[];
  durationSec: number;
  dropAtSec: number;
  axisSize?: number;
  draw?: number;
  pop?: number;
  ring?: number;
  id?: string;
}) {
  const x = (t: number) => (t / durationSec) * W;
  const y = (r: number) => TOP + (1 - r / 100) * (BOTTOM - TOP);
  const line = smoothPath(points.map((p) => [x(p[0]), y(p[1])]));
  const area = `${line} L ${W},${BOTTOM} L 0,${BOTTOM} Z`;
  const dropPoint = points.find((p) => p[0] === dropAtSec) ?? points[0];
  const dropX = x(dropAtSec);
  const dropY = y(dropPoint[1]);
  const mid = Math.round(durationSec / 2);
  // o marcador passa um pouco do tamanho e volta: um "clique", não um salto
  const popScale = pop <= 0 ? 0 : pop < 0.6 ? (pop / 0.6) * 1.35 : 1.35 - ((pop - 0.6) / 0.4) * 0.35;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={`${id}-reveal`}>
          <rect x="0" y="0" width={W * draw} height={H} />
        </clipPath>
      </defs>
      {[75, 50, 25].map((v) => (
        <line key={v} x1={axisSize * 3.4} y1={y(v)} x2={W} y2={y(v)} stroke={C.line} strokeWidth="1.5" strokeDasharray="4 5" opacity="0.8" />
      ))}
      <path d={area} fill="rgba(31, 71, 166, 0.07)" clipPath={`url(#${id}-reveal)`} />
      <path d={line} pathLength={1} stroke={C.ink} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - draw} />

      <g opacity={pop > 0 ? 1 : 0}>
        <line x1={dropX} y1={dropY + 14} x2={dropX} y2={dropY + 14 + (BOTTOM - dropY - 14) * Math.min(1, pop * 1.4)} stroke={C.accent} strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
        {ring > 0 && ring < 1 && <circle cx={dropX} cy={dropY} r={13 + ring * 34} fill="none" stroke={C.accent} strokeWidth={2.5 * (1 - ring)} opacity={0.55 * (1 - ring)} />}
        <circle cx={dropX} cy={dropY} r={13} fill="none" stroke={C.accent} strokeWidth="2" opacity={0.25 * Math.min(1, pop)} />
        <circle cx={dropX} cy={dropY} r={8 * popScale} fill={C.accent} />
      </g>

      {[75, 50, 25].map((v) => (
        <text key={v} x="2" y={y(v) + axisSize * 0.35} fill={C.inkMuted} fontSize={axisSize} fontFamily={FONT.mono}>
          {v}%
        </text>
      ))}
      {dropX > axisSize * 4.8 && (
        <text x="2" y="276" fill={C.inkMuted} fontSize={axisSize} fontFamily={FONT.mono}>
          {fmt(0)}
        </text>
      )}
      <text x={dropX} y="276" textAnchor="middle" fill={C.accent} fontSize={axisSize} fontWeight="500" fontFamily={FONT.mono} opacity={pop > 0 ? 1 : 0.35}>
        {fmt(dropAtSec)}
      </text>
      <text x={x(mid)} y="276" textAnchor="middle" fill={C.inkMuted} fontSize={axisSize} fontFamily={FONT.mono}>
        {fmt(mid)}
      </text>
      <text x={W - 2} y="276" textAnchor="end" fill={C.inkMuted} fontSize={axisSize} fontFamily={FONT.mono}>
        {fmt(durationSec)}
      </text>
    </svg>
  );
}
