import { easeInOut, easeOut, mix, progress } from "../anim";

/* ==========================================================================
   O caderno da Publishub em 3D: abre, a caneta escreve o nome na página e
   sublinha, fecha, a caneta encaixa no ângulo do logo e o nome entra ao lado.
   O desenho tem as medidas de frontend/src/components/LogoArt.tsx, no mesmo
   sistema de coordenadas; o último quadro é o logo do site (com o respiro
   recortado em volta da caneta).
   A capa gira em volta da lombada com perspectiva de verdade (CSS 3D): por fora,
   caramelo com o elástico e a borda das páginas; por dentro, o forro creme.
   Quem usa: LogoOpen.tsx (o logo sozinho) e o convite do anúncio (Acquire.tsx).
   `f` é o quadro relativo ao começo; `L` diz quando cada coisa acontece.
   ========================================================================== */

export type LogoTimeline = {
  appear: number;
  open: [number, number];
  pen: [number, number];
  write: [number, number];
  underline: [number, number];
  lift: [number, number];
  close: [number, number];
  halo: number;
  lockup: number;
  word: number;
};

const C = { cover: "#C9824A", back: "#B97440", lining: "#F4E6CF", band: "#1E1B18", page: "#FBF3E6", rule: "#E6D5BC", margin: "#EBBE98", pen: "#1F47A6" };

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
const MARK = { x: 405, y: 368, w: 500, h: 524 };
const NB_CX = NB.x + NB.w / 2; // 585: o centro do caderno fechado
const NB_CY = NB.y + NB.h / 2; // 630
const MARK_CX = MARK.x + MARK.w / 2; // 655: o centro do símbolo (a caneta puxa para a direita)

// a página: pauta a cada 46, e o nome escrito na terceira linha, em tinta azul
const PAGE = { x: 409, y: 378, w: 346, h: 504 };
const RULES = Array.from({ length: 9 }, (_, i) => 470 + i * 46);
const WRITE = { x: 446, base: 646, size: 82 };
const UNDER = [446, 676, 520, 688, 640, 664, 734, 674] as const; // a curva do sublinhado (bezier)
const UNDERLINE = `M${UNDER[0]} ${UNDER[1]} C ${UNDER[2]} ${UNDER[3]}, ${UNDER[4]} ${UNDER[5]}, ${UNDER[6]} ${UNDER[7]}`;

/** Largura de um texto com a fonte já carregada (o loadFont segura o render até ela chegar). */
function measure(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 30;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 30;
  ctx.font = font;
  return ctx.measureText(text).width;
}

const bez = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

function PenParts({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      {PEN_PARTS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

/** O logo parado, idêntico ao LogoArt (com o respiro recortado). */
function Mark({ id }: { id: string }) {
  return (
    <svg viewBox={`${MARK.x} ${MARK.y} ${MARK.w} ${MARK.h}`} width={MARK.w} height={MARK.h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
          <rect width="1254" height="1254" fill="#fff" />
          <g transform={`translate(${PEN_END.x} ${PEN_END.y}) rotate(${PEN_END.rot})`}>
            <g fill="#000" stroke="#000" strokeWidth={HALO * 2} strokeLinejoin="round">
              {PEN_PARTS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <rect x={-42.5} y={-345} width={13} height={HALO} fill="#000" />
            <rect x={29.5} y={-345} width={13} height={HALO} fill="#000" />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id}-cut)`}>
        <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={NB.r} fill={C.cover} />
        <rect x={BAND.x} y={NB.y} width={BAND.w} height={NB.h} fill={C.band} />
        <path d={PAGE_EDGE} fill={C.page} />
      </g>
      <g transform={`translate(${PEN_END.x} ${PEN_END.y}) rotate(${PEN_END.rot})`}>
        <PenParts fill={C.pen} />
        <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill={C.page} />
        <circle cx={0} cy={-4} r={3.2} fill={C.band} />
      </g>
    </svg>
  );
}

export function NotebookLogo({
  f,
  L,
  start,
  end,
  ink = "#1E1B18",
  id,
}: {
  f: number;
  L: LogoTimeline;
  /** o centro do caderno fechado, em px, e quantos px vale uma unidade do desenho */
  start: { cx: number; cy: number; k: number };
  /** o logo horizontal no fim: onde ele começa (esquerda), a linha do meio e a altura do símbolo */
  end: { left: number; cy: number; markH: number };
  ink?: string;
  id: string;
}) {
  if (f < L.appear - 1) return null;

  /* ---- a capa: 0° fechada, 180° aberta */
  const opening = progress(f, L.open[0], L.open[1] - L.open[0], easeInOut);
  const closing = progress(f, L.close[0], L.close[1] - L.close[0], easeInOut);
  const deg = 180 * (opening - closing);
  const open = (1 - Math.cos((deg * Math.PI) / 180)) / 2; // 0 → 1, para o que acompanha a abertura
  const shift = (NB.w / 2) * open; // aberto, o caderno anda meia largura para ficar no centro

  /* ---- a escrita e a caneta */
  const wordW = measure("Publishub", `700 ${WRITE.size}px Caveat`);
  const write = progress(f, L.write[0], L.write[1] - L.write[0], (t) => t);
  const under = progress(f, L.underline[0], L.underline[1] - L.underline[0], easeInOut);
  const tip = (p: number) => ({ x: WRITE.x + wordW * p, y: WRITE.base - 22 + 14 * Math.sin(p * Math.PI * 16) - 6 * Math.sin(p * Math.PI) });
  const penIn = progress(f, L.pen[0], L.pen[1] - L.pen[0], easeOut);
  const s0 = tip(0);
  let pen = { x: mix(900, s0.x, penIn), y: mix(120, s0.y, penIn), rot: mix(42, 24.4, penIn) };
  if (f >= L.write[0]) pen = { ...tip(write), rot: 24.4 };
  if (f >= L.underline[0]) pen = { x: bez(UNDER[0], UNDER[2], UNDER[4], UNDER[6], under), y: bez(UNDER[1], UNDER[3], UNDER[5], UNDER[7], under), rot: 24.4 };
  const lift = progress(f, L.lift[0], L.lift[1] - L.lift[0], easeInOut);
  if (f >= L.lift[0]) pen = { x: mix(UNDER[6], PEN_END.x, lift), y: mix(UNDER[7], PEN_END.y, lift) - 150 * Math.sin(Math.PI * lift), rot: 24.4 };

  /* ---- o fim: o logo de verdade e o logo horizontal */
  const fin = progress(f, L.halo, 4);
  const lock = progress(f, L.lockup, 20, easeInOut);
  const word = progress(f, L.word, 16, easeInOut);
  const S = end.markH / 1.3; // o corpo do nome, como no site
  const markW = (end.markH * MARK.w) / MARK.h;
  const k = mix(start.k, end.markH / MARK.h, lock);
  const mcx = mix(start.cx + (MARK_CX - NB_CX) * start.k, end.left + markW / 2, lock);
  const mcy = mix(start.cy, end.cy, lock);
  // o desenho inteiro em unidades do logo, com a origem no canto do símbolo
  const left = mcx - (MARK_CX - MARK.x) * k;
  const top = mcy - (NB_CY - MARK.y) * k;
  const appear = progress(f, L.appear, 16, easeOut);
  const u = (x: number, y: number) => ({ left: x - MARK.x, top: y - MARK.y }); // do desenho para a caixa

  return (
    <>
      <div style={{ position: "absolute", left, top: top + (1 - appear) * 40 * k, width: MARK.w, height: MARK.h, transform: `scale(${k})`, transformOrigin: "0 0", opacity: appear }}>
        {/* a sombra no "chão" */}
        <div style={{ position: "absolute", ...u(NB.x - NB.w * open + shift - 10, NB.y + NB.h - 10), width: NB.w + 20 + NB.w * open, height: 40, borderRadius: "50%", background: "rgba(70,40,15,0.22)", filter: "blur(16px)", opacity: 1 - fin * 0.4 }} />

        {/* o caderno: contracapa, páginas e a capa que gira; anda para a direita conforme abre */}
        <div style={{ position: "absolute", ...u(NB.x, NB.y), width: NB.w, height: NB.h, transform: `translateX(${shift}px)`, perspective: 1500, perspectiveOrigin: "0px 50%", opacity: 1 - fin }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: `${NB.r * (1 - open)}px ${NB.r}px ${NB.r}px ${NB.r * (1 - open)}px`, background: C.back }} />
          <div style={{ position: "absolute", left: 0, top: PAGE.y - NB.y, width: PAGE.w, height: PAGE.h, borderRadius: `${54 * (1 - open)}px 54px 54px ${54 * (1 - open)}px`, background: C.page, overflow: "hidden" }}>
            {RULES.map((y) => (
              <div key={y} style={{ position: "absolute", left: 22, right: 18, top: y - PAGE.y, height: 2.2, background: C.rule }} />
            ))}
            <div style={{ position: "absolute", left: 21, top: 22, bottom: 22, width: 2, background: C.margin, opacity: 0.7 }} />
            {/* a dobra da lombada */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 46, background: "linear-gradient(90deg, rgba(90,58,30,0.2), rgba(90,58,30,0))", opacity: open }} />
            {/* o nome escrito à mão e o sublinhado */}
            <svg viewBox={`${PAGE.x} ${PAGE.y} ${PAGE.w} ${PAGE.h}`} width={PAGE.w} height={PAGE.h} style={{ position: "absolute", inset: 0 }}>
              <defs>
                <clipPath id={`${id}-write`}>
                  <rect x={WRITE.x - 12} y={WRITE.base - 90} width={(wordW + 24) * write} height={130} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${id}-write)`}>
                <text x={WRITE.x} y={WRITE.base} fontFamily="Caveat, cursive" fontWeight={700} fontSize={WRITE.size} fill={C.pen}>
                  Publishub
                </text>
              </g>
              {under > 0 && <path d={UNDERLINE} fill="none" stroke={C.pen} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - under} />}
            </svg>
            {/* a sombra da capa enquanto ela ainda está sobre a página */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(60,35,15,1)", opacity: 0.14 * Math.max(0, Math.cos((deg * Math.PI) / 180)) * Math.min(1, deg / 25) }} />
          </div>

          {/* a capa */}
          <div style={{ position: "absolute", inset: 0, transformOrigin: "0 50%", transform: `rotateY(${-deg}deg)`, transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: NB.r, background: C.cover, backfaceVisibility: "hidden", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: BAND.x - NB.x, top: 0, width: BAND.w, height: NB.h, background: C.band }} />
              <svg viewBox={`${NB.x} ${NB.y} ${NB.w} ${NB.h}`} width={NB.w} height={NB.h} style={{ position: "absolute", inset: 0 }}>
                <path d={PAGE_EDGE} fill={C.page} />
              </svg>
              <div style={{ position: "absolute", inset: 0, background: "#3C230F", opacity: 0.3 * Math.min(1, deg / 90) }} />
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: `${NB.r}px 0 0 ${NB.r}px`, background: C.cover, backfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 12, top: 12, bottom: 12, right: 0, borderRadius: `${NB.r - 12}px 0 0 ${NB.r - 12}px`, background: C.lining }} />
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 46, background: "linear-gradient(270deg, rgba(90,58,30,0.18), rgba(90,58,30,0))" }} />
              <div style={{ position: "absolute", inset: 0, background: "#3C230F", opacity: 0.3 * Math.max(0, Math.min(1, (180 - deg) / 90)) }} />
            </div>
          </div>

          {/* a caneta, sempre por cima */}
          {f >= L.pen[0] && (
            <svg viewBox={`${NB.x} ${NB.y} ${NB.w} ${NB.h}`} width={NB.w} height={NB.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <g transform={`translate(${pen.x} ${pen.y}) rotate(${pen.rot})`}>
                <PenParts fill={C.pen} />
                <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill={C.page} />
                <circle cx={0} cy={-4} r={3.2} fill={C.band} />
              </g>
            </svg>
          )}
        </div>

        {/* o logo de verdade, que assume quando a caneta encaixa */}
        {fin > 0 && (
          <div style={{ position: "absolute", left: 0, top: 0, opacity: fin }}>
            <Mark id={id} />
          </div>
        )}
      </div>

      {/* o nome ao lado do símbolo, como no logo do site */}
      {word > 0 && (
        <div
          style={{
            position: "absolute",
            left: end.left + markW + 0.4 * S,
            top: end.cy - S * 0.56,
            fontFamily: "Geist, sans-serif",
            fontWeight: 600,
            fontSize: S,
            lineHeight: 1.1,
            letterSpacing: "-0.035em",
            color: ink,
            whiteSpace: "nowrap",
            clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
            transform: `translateX(${(1 - word) * -0.2}em)`,
          }}
        >
          Publishub
        </div>
      )}
    </>
  );
}

/** Onde o logo horizontal fica centralizado: a largura dele para um símbolo de altura `markH`. */
export function lockupWidth(markH: number) {
  const S = markH / 1.3;
  return (markH * MARK.w) / MARK.h + 0.4 * S + measure("Publishub", `600 ${S}px Geist`) - 9 * 0.035 * S;
}
