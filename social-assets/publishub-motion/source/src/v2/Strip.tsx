import { Img, staticFile } from "remotion";
import { FONT } from "../theme";
import { CLIPS, CURVE, D, DROP_SEC, REEL_SEC } from "./theme";

/**
 * A timeline do Reel de exemplo, com os quadros reais de cada clipe e, em cima,
 * a curva de retenção que a análise desenha.
 *
 * scan (0 → 1): a cabeça de leitura passa pelo vídeo e a curva aparece atrás dela.
 * drop (0 → 1): o marcador da queda acende e o trecho fraco ganha o colchete.
 * cut (0 → 1): o trecho fraco sai, os outros encostam e a curva antiga some
 *              (o vídeo mudou; a peça não inventa a curva nova).
 * head (s): onde está a agulha depois do corte, em segundos do Reel editado.
 */
export function Strip({
  width,
  curveH,
  thumbH,
  scan,
  drop,
  cut,
  head,
  fontSize,
}: {
  width: number;
  curveH: number;
  thumbH: number;
  scan: number;
  drop: number;
  cut: number;
  head: number | null;
  fontSize: number;
}) {
  const gap = 4;
  const pxs = width / REEL_SEC;
  const lettuce = CLIPS[0];
  const shift = lettuce.dur * pxs * cut; // quanto os outros clipes andam para a esquerda

  // a curva, no espaço do Reel original
  const x = (t: number) => t * pxs;
  // 100% no topo, 35% embaixo: a parte da escala onde a curva do exemplo vive
  const y = (r: number) => 6 + ((100 - r) / 65) * (curveH - 12);
  const pts = CURVE.map(([t, r]) => [x(t), y(r)] as [number, number]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  const area = `${d} L ${width} ${curveH} L 0 ${curveH} Z`;
  const dropX = x(DROP_SEC);
  const dropY = pts[DROP_SEC][1];
  const scanX = width * scan;
  const curveOpacity = 1 - cut;

  let t0 = 0;
  const placed = CLIPS.map((c) => {
    const p = { ...c, x: t0 * pxs, w: c.dur * pxs - gap };
    t0 += c.dur;
    return p;
  });

  const total = (REEL_SEC - lettuce.dur * cut) * pxs;
  const fmt = (s: number) => `0:${String(Math.round(s)).padStart(2, "0")}`;

  return (
    <div style={{ position: "relative", width, height: curveH + thumbH + fontSize * 2.2 }}>
      {/* a curva */}
      <svg width={width} height={curveH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: curveOpacity }}>
        <defs>
          <clipPath id="strip-scan">
            <rect x={0} y={-20} width={scanX} height={curveH + 40} />
          </clipPath>
        </defs>
        <g clipPath="url(#strip-scan)">
          <path d={area} fill={D.accent} opacity={0.12} />
          <path d={d} fill="none" stroke={D.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {drop > 0 && (
          <g opacity={Math.min(1, drop * 1.5)}>
            <line x1={dropX} y1={dropY + 10} x2={dropX} y2={curveH + thumbH} stroke={D.accent} strokeWidth={2} strokeDasharray="5 4" />
            <circle cx={dropX} cy={dropY} r={8 + 26 * drop} fill="none" stroke={D.accent} strokeWidth={2} opacity={0.5 * (1 - drop)} />
            <circle cx={dropX} cy={dropY} r={7 * Math.min(1.25, drop * 1.6)} fill={D.accent} />
          </g>
        )}
      </svg>

      {/* os clipes */}
      <div style={{ position: "absolute", left: 0, top: curveH, width, height: thumbH }}>
        {placed.map((c, i) => {
          const isLettuce = i === 0;
          const w = isLettuce ? c.w * (1 - cut) : c.w;
          const left = isLettuce ? c.x : c.x - shift;
          const tileW = (thumbH * 9) / 16;
          const tiles = Math.max(1, Math.ceil(c.w / tileW));
          return (
            <div key={c.id} style={{ position: "absolute", left, top: 0, width: Math.max(0, w), height: thumbH, borderRadius: 8, overflow: "hidden", opacity: isLettuce ? 1 - cut : 1, background: D.surface }}>
              <div style={{ display: "flex", height: "100%" }}>
                {Array.from({ length: tiles }).map((_, k) => (
                  <Img key={k} src={staticFile(c.thumbs[k % c.thumbs.length])} style={{ width: tileW, height: thumbH, objectFit: "cover", flexShrink: 0 }} />
                ))}
              </div>
              {/* o trecho fraco: escurecido e com o contorno da caneta */}
              {isLettuce && drop > 0 && <div style={{ position: "absolute", inset: 0, borderRadius: 8, boxShadow: `inset 0 0 0 3px ${D.accent}`, background: `rgba(30,40,64,${0.45 * drop})`, opacity: drop }} />}
            </div>
          );
        })}
        {/* a cabeça de leitura da análise */}
        {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: scanX - 1, top: -curveH, width: 2, height: curveH + thumbH, background: D.accent, boxShadow: `0 0 12px ${D.accent}` }} />}
        {/* a agulha do vídeo editado */}
        {head !== null && (
          <div style={{ position: "absolute", left: Math.min(total - 2, head * pxs) - 1.5, top: -10, width: 3, height: thumbH + 20, background: D.ink, borderRadius: 2 }} />
        )}
      </div>

      {/* tempos */}
      <div style={{ position: "absolute", left: 0, top: curveH + thumbH + fontSize * 0.5, width, height: fontSize * 1.4, fontFamily: FONT.mono, fontSize, color: D.muted }}>
        <span style={{ position: "absolute", left: 0 }}>0:00</span>
        <span style={{ position: "absolute", left: dropX, transform: "translateX(-50%)", color: D.accent, opacity: drop * (1 - cut) }}>{fmt(DROP_SEC)}</span>
        <span style={{ position: "absolute", left: total, transform: "translateX(-100%)" }}>{fmt(REEL_SEC - lettuce.dur * cut)}</span>
      </div>
    </div>
  );
}
