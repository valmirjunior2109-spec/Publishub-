import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress } from "../anim";
import T from "./timeline.json";

/* ==========================================================================
   Publishub · o logo em movimento: o caderno abre, a caneta escreve o nome na
   página, o caderno fecha e vira o logo, e o nome entra ao lado. 6 s.
   O desenho é o de frontend/src/components/LogoArt.tsx (as mesmas medidas, no
   mesmo sistema de coordenadas): no último estado, com o respiro da caneta
   recortado, é exatamente o logo do site.
   A capa gira em volta da lombada (x 409) com escala em x; quando o cosseno fica
   negativo aparece o lado de dentro. Tudo num SVG só, sem 3D do CSS.
   `background`: o creme do site atrás, ou transparente (para sobrepor a vídeos).
   Os quadros estão em timeline.json; a trilha (make-sound-logo.mjs) lê o mesmo.
   ========================================================================== */

export const LOGO_FPS = T.fps;
export const LOGO_FRAMES = T.durationInFrames;

const C = { cover: "#C9824A", coverDeep: "#A9653A", lining: "#F4E6CF", band: "#1E1B18", page: "#FBF3E6", rule: "#E8D9C2", pen: "#1F47A6", ink: "#1E1B18", stage: "#F0E2CA" };

// LogoArt.tsx
const NB = { x: 409, y: 372, w: 352, h: 516, r: 60 };
const BAND = { x: 657, w: 37 };
const PAGE_EDGE = "M463.5 795 H657 V850 H463.5 A27.5 27.5 0 0 1 463.5 795 Z";
const PEN_END = { x: 651, y: 888, rot: 24.4 };
const HALO = 19;
const PEN_PARTS = [
  "M0 0 C 7 -22, 20 -62, 20 -106 L -20 -106 C -20 -62, -7 -22, 0 0 Z",
  "M-20 -116 H20 C 20 -138, 10.5 -150, 10.5 -168 H-10.5 C -10.5 -150, -20 -138, -20 -116 Z",
  "M-10.5 -167 H10.5 V-335 H-10.5 Z",
  "M-23.5 -345 H23.5 V-517.5 A23.5 23.5 0 0 0 -23.5 -517.5 Z",
  "M38 -302 A8 8 0 0 1 54 -302 V-480 Q54 -486 48 -486 H21.5 V-470 H38 Z",
];
const SHOULDERS = [
  { x: -42.5, y: -345 },
  { x: 29.5, y: -345 },
];
const MARK = { x: 405, y: 368, w: 500, h: 524 }; // o enquadramento do símbolo (MARK_VIEWBOX)

// a área desenhada: o caderno aberto ocupa de 233 a 937 depois de centralizado
const VB = { x: 135, y: 290, w: 900, h: 650 };
const HINGE = { x: NB.x, y: NB.y + NB.h / 2 };
const OPEN_SHIFT = NB.w / 2; // aberto, o caderno anda meia largura para ficar no centro

// a escrita: na pauta, em tinta azul, com a letra de mão do site
const WORD = "Publishub";
const WRITE = { x: 446, base: 646, size: 82 };
const UNDERLINE = "M446 676 C 520 688, 640 664, 734 674";
const RULES = Array.from({ length: 9 }, (_, i) => 470 + i * 46);
const PAGE_PATH = "M409 378 H701 A54 54 0 0 1 755 432 V828 A54 54 0 0 1 701 882 H409 Z";

/** Largura de um texto com a fonte já carregada (o loadFont segura o render até ela chegar). */
function measure(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 30;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 30;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function Pen({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g fill={C.pen}>
        {PEN_PARTS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill={C.page} />
      <circle cx={0} cy={-4} r={3.2} fill={C.band} />
    </g>
  );
}

/** O contorno da caneta, engrossado no respiro: vira o recorte do caderno no fim. */
function PenOutline({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g fill="#000" stroke="#000" strokeWidth={HALO * 2} strokeLinejoin="round">
        {PEN_PARTS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {SHOULDERS.map((s) => (
        <rect key={s.x} x={s.x} y={s.y} width={13} height={HALO} fill="#000" />
      ))}
    </g>
  );
}

export function LogoOpen({ background = true, sound = true }: { background?: boolean; sound?: boolean }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = background ? "logo" : "logo-alpha";

  /* ---- a capa: abre e fecha (ângulo de 0 a π em volta da lombada) */
  const opening = progress(f, T.open[0], T.open[1] - T.open[0], easeInOut);
  const closing = progress(f, T.close[0], T.close[1] - T.close[0], easeInOut);
  const theta = Math.PI * (opening - closing);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const shift = OPEN_SHIFT * (1 - cos) / 2;
  const coverT = `translate(${HINGE.x} ${HINGE.y}) scale(${cos} ${1 + 0.05 * sin}) translate(${-HINGE.x} ${-HINGE.y})`;
  const front = cos >= 0;

  /* ---- o elástico sai antes de abrir e volta depois de fechar */
  const bandAway = progress(f, T.bandOff, 10, easeIn) * (1 - progress(f, T.bandOn, 8, easeOut));

  /* ---- a escrita */
  const wordW = measure(WORD, `700 ${WRITE.size}px Caveat`);
  const write = progress(f, T.write[0], T.write[1] - T.write[0], (t) => t);
  const under = progress(f, T.underline[0], T.underline[1] - T.underline[0], easeInOut);

  /* ---- a caneta: entra pelo alto, escreve, sublinha e encaixa no lugar do logo */
  const tipWrite = (p: number) => ({ x: WRITE.x + wordW * p, y: WRITE.base - 20 + 15 * Math.sin(p * Math.PI * 16) - 8 * Math.sin(p * Math.PI) });
  let pen = { x: 960, y: 260, rot: 40 };
  const penIn = progress(f, T.pen[0], T.pen[1] - T.pen[0], easeOut);
  const start = tipWrite(0);
  pen = { x: mix(960, start.x, penIn), y: mix(150, start.y, penIn), rot: mix(40, 24.4, penIn) };
  if (f >= T.write[0]) pen = { ...tipWrite(write), rot: 24.4 };
  if (f >= T.underline[0]) {
    // o sublinhado: a ponta segue a curva do traço
    const u = under;
    const bez = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
    pen = { x: bez(446, 520, 640, 734, u), y: bez(676, 688, 664, 674, u), rot: 24.4 };
  }
  const lift = progress(f, T.lift[0], T.lift[1] - T.lift[0], easeInOut);
  if (f >= T.lift[0]) {
    // levanta, passa por cima do caderno fechando e desce no ângulo do logo (no referencial já fechado)
    const from = { x: 734, y: 674 };
    pen = { x: mix(from.x, PEN_END.x, lift), y: mix(from.y, PEN_END.y, lift) - 120 * Math.sin(Math.PI * lift), rot: 24.4 };
  }
  const penVisible = f >= T.pen[0];
  const halo = progress(f, T.halo, 6);

  /* ---- a assinatura: o símbolo encolhe para a esquerda e o nome entra */
  const k0 = Math.min((width * 0.92) / VB.w, (height * 0.62) / VB.h); // px por unidade, no começo
  const lock = progress(f, T.lockup, 20, easeInOut);
  const word = progress(f, T.word, 16, easeInOut);
  const markH = Math.min(width * 0.18, 200); // a altura do símbolo no logo horizontal
  const S = markH / 1.3; // o corpo do nome, como no site
  const markW = (markH * MARK.w) / MARK.h;
  const nameW = measure("Publishub", `600 ${S}px Geist`) - 9 * 0.035 * S;
  const total = markW + 0.4 * S + nameW;
  const lockLeft = (width - total) / 2;
  const kEnd = markH / MARK.h;
  const k = mix(k0, kEnd, lock);
  // centro do símbolo: no meio da tela durante a animação, no lugar do logo horizontal no fim
  const markCx = mix(width / 2 + (MARK.x + MARK.w / 2 - (NB.x + NB.w / 2)) * k0, lockLeft + markW / 2, lock);
  const markCy = mix(height / 2, height / 2, lock);
  const svgLeft = markCx - (MARK.x + MARK.w / 2 - VB.x) * k;
  const svgTop = markCy - (MARK.y + MARK.h / 2 - VB.y) * k;

  const appear = progress(f, T.appear, 16, easeOut);
  const shadow = 0.18 * appear * (1 - lock);

  return (
    <AbsoluteFill style={{ background: background ? `radial-gradient(80% 70% at 50% 45%, #F6EBD8, ${C.stage})` : "transparent" }}>
      {sound && <Audio src={staticFile("soundtrack-logo.wav")} />}
      <svg
        width={VB.w * k}
        height={VB.h * k}
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        style={{ position: "absolute", left: svgLeft, top: svgTop + (1 - appear) * 50, overflow: "visible", opacity: appear }}
      >
        <defs>
          <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="-500" y="-500" width="2500" height="2500">
            <rect x="-500" y="-500" width="2500" height="2500" fill="#fff" />
            <g opacity={halo}>
              <PenOutline {...pen} />
            </g>
          </mask>
          <linearGradient id={`${id}-gutter`} x1="0" x2="1">
            <stop offset="0" stopColor="#5A3A1E" stopOpacity="0.22" />
            <stop offset="1" stopColor="#5A3A1E" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <clipPath id={`${id}-write`}>
            <rect x={WRITE.x - 10} y={500} width={(wordW + 20) * write} height={220} />
          </clipPath>
        </defs>

        <g transform={`translate(${shift} 0)`}>
          {/* a sombra no "chão" */}
          <ellipse cx={NB.x + NB.w / 2 - shift * 1} cy={NB.y + NB.h + 14} rx={NB.w * 0.55 + shift} ry={18} fill="#3C230F" opacity={shadow} filter={`url(#${id}-soft)`} />

          <g mask={`url(#${id}-cut)`}>
            {/* a contracapa e as páginas, que aparecem quando a capa sai */}
            <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={NB.r} fill={C.coverDeep} />
            <path d={PAGE_PATH} fill={C.page} />
            {RULES.map((y) => (
              <line key={y} x1={432} x2={736} y1={y} y2={y} stroke={C.rule} strokeWidth={2.2} />
            ))}
            <line x1={430} x2={430} y1={400} y2={862} stroke="#E9B892" strokeWidth={2} opacity={0.7} />
            <rect x={NB.x} y={378} width={40} height={504} fill={`url(#${id}-gutter)`} opacity={(1 - cos) / 2} />

            {/* o nome escrito à mão, na tinta da caneta */}
            <g clipPath={`url(#${id}-write)`}>
              <text x={WRITE.x} y={WRITE.base} fontFamily="Caveat, cursive" fontWeight={700} fontSize={WRITE.size} fill={C.pen}>
                {WORD}
              </text>
            </g>
            {under > 0 && <path d={UNDERLINE} fill="none" stroke={C.pen} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - under} />}

            {/* a sombra da capa sobre a página enquanto ela está no ar */}
            <rect x={NB.x} y={378} width={NB.w} height={504} fill="#3C230F" opacity={0.16 * Math.max(0, sin) * (front ? 1 : 0.5)} />

            {/* a capa: por fora (caramelo, elástico e a borda das páginas) ou por dentro (o forro) */}
            <g transform={coverT}>
              {front ? (
                <>
                  <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={NB.r} fill={C.cover} />
                  <path d={PAGE_EDGE} fill={C.page} />
                  <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={NB.r} fill="#000" opacity={0.22 * (1 - cos)} />
                </>
              ) : (
                <>
                  <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={NB.r} fill={C.cover} />
                  <rect x={NB.x + 14} y={NB.y + 14} width={NB.w - 28} height={NB.h - 28} rx={NB.r - 12} fill={C.lining} />
                  <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={NB.r} fill="#000" opacity={0.18 * (1 + cos)} />
                </>
              )}
            </g>

            {/* o elástico: por cima da capa fechada; sai para a direita antes de abrir */}
            {front && <rect x={BAND.x + 90 * bandAway} y={NB.y} width={BAND.w} height={NB.h} fill={C.band} opacity={1 - bandAway} transform={coverT} />}
          </g>

          {penVisible && <Pen {...pen} />}
        </g>
      </svg>

      {/* o nome, ao lado do símbolo, como no logo do site */}
      {word > 0 && (
        <div
          style={{
            position: "absolute",
            left: lockLeft + markW + 0.4 * S,
            top: height / 2 - S * 0.56,
            fontFamily: "Geist, sans-serif",
            fontWeight: 600,
            fontSize: S,
            lineHeight: 1.1,
            letterSpacing: "-0.035em",
            color: C.ink,
            whiteSpace: "nowrap",
            clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
            transform: `translateX(${(1 - word) * -0.2}em)`,
          }}
        >
          Publishub
        </div>
      )}
    </AbsoluteFill>
  );
}
