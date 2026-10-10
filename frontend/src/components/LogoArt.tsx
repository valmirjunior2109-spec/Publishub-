/* ==========================================================================
   O desenho do logo: o caderno do editor com a caneta. A única fonte dos números.
   --------------------------------------------------------------------------
   Coordenadas do ícone de referência (um quadro de 1254 px): o caderno de x 409
   a 761 e de y 372 a 888 (cantos de 60), o elástico de x 657 a 694, a borda das
   páginas de y 795 a 850 e a caneta a 24,4° com a ponta em (651, 888). As peças
   da caneta (ponta, empunhadura, corpo, tampa e clipe) são desenhadas no eixo
   dela, com a ponta em (0, 0) subindo pelo y negativo.

   Onde a caneta passa sobre o caderno há um respiro de 19 px. Dois jeitos de
   fazer esse respiro:
     - `maskId`: um recorte transparente (o site, onde o fundo muda de lugar para
       lugar e entre os temas claro e escuro);
     - `halo`: a cor do fundo (as imagens geradas no servidor com next/og, que
       não desenham máscara, e onde o fundo é conhecido).
   Quem usa: Logo.tsx (site), apple-icon.tsx, a rota /og e, gerados do mesmo
   desenho, icon.svg e favicon.ico (ver o comentário em icon.svg).
   ========================================================================== */

import type { CSSProperties } from "react";

/** O enquadramento do símbolo sozinho, com 4 px de folga em volta. */
export const MARK_VIEWBOX = { x: 405, y: 368, width: 500, height: 524 };
export const MARK_RATIO = MARK_VIEWBOX.width / MARK_VIEWBOX.height;

export const LOGO_COLORS = {
  cover: "#C9824A", // o caramelo do caderno
  band: "#1E1B18", // o elástico, em tinta
  page: "#FBF3E6", // a borda das páginas e o brilho da caneta
  pen: "#1F47A6", // a caneta azul
};

const NOTEBOOK = { x: 409, y: 372, width: 352, height: 516, r: 60 };
const BAND = { x: 657, width: 37 };
const PAGE_EDGE = "M463.5 795 H657 V850 H463.5 A27.5 27.5 0 0 1 463.5 795 Z";

const PEN_TRANSFORM = "translate(651 888) rotate(24.4)";
const HALO = 19;
const PEN_PARTS = [
  "M0 0 C 7 -22, 20 -62, 20 -106 L -20 -106 C -20 -62, -7 -22, 0 0 Z", // a ponta
  "M-20 -116 H20 C 20 -138, 10.5 -150, 10.5 -168 H-10.5 C -10.5 -150, -20 -138, -20 -116 Z", // a empunhadura
  "M-10.5 -167 H10.5 V-335 H-10.5 Z", // o corpo
  "M-23.5 -345 H23.5 V-517.5 A23.5 23.5 0 0 0 -23.5 -517.5 Z", // a tampa
  "M38 -302 A8 8 0 0 1 54 -302 V-480 Q54 -486 48 -486 H21.5 V-470 H38 Z", // o clipe
];
// o canto de baixo da tampa: o respiro redondo deixaria um calombo do caderno entre a tampa e o corpo
const SHOULDERS = [
  { x: -42.5, y: -345, width: 13, height: HALO },
  { x: 29.5, y: -345, width: 13, height: HALO },
];

interface LogoArtProps {
  /** `mark`: só o símbolo (MARK_VIEWBOX); `icon`: o ícone quadrado, com fundo. */
  frame?: "mark" | "icon";
  width: number | string;
  height: number | string;
  /** Recorte transparente no respiro da caneta: um id único na página. */
  maskId?: string;
  /** Ou o respiro pintado nesta cor (o fundo, quando ele é conhecido). */
  halo?: string;
  /** O fundo do ícone (frame "icon"). */
  background?: string;
  /** A cor da caneta; no site é var(--logo-pen), que clareia no tema escuro. */
  pen?: string;
  className?: string;
  style?: CSSProperties;
}

/** O caderno com a caneta. Sem hooks: serve também para o next/og. */
export function LogoArt({ frame = "mark", width, height, maskId, halo, background, pen = LOGO_COLORS.pen, className, style }: LogoArtProps) {
  const box = frame === "icon" ? "0 0 1254 1254" : `${MARK_VIEWBOX.x} ${MARK_VIEWBOX.y} ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`;
  // listas com key, sem fragmentos: o next/og (Satori) monta o SVG sozinho e não entende <></>
  const notebook = [
    <rect key="cover" x={NOTEBOOK.x} y={NOTEBOOK.y} width={NOTEBOOK.width} height={NOTEBOOK.height} rx={NOTEBOOK.r} fill={LOGO_COLORS.cover} />,
    <rect key="band" x={BAND.x} y={NOTEBOOK.y} width={BAND.width} height={NOTEBOOK.height} fill={LOGO_COLORS.band} />,
    <path key="page" d={PAGE_EDGE} fill={LOGO_COLORS.page} />,
  ];
  const outline = (key: string, color: string) => [
    <g key={`${key}-pen`} transform={PEN_TRANSFORM} fill={color} stroke={color} strokeWidth={HALO * 2} strokeLinejoin="round">
      {PEN_PARTS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>,
    <g key={`${key}-shoulders`} transform={PEN_TRANSFORM} fill={color}>
      {SHOULDERS.map((s) => (
        <rect key={s.x} x={s.x} y={s.y} width={s.width} height={s.height} />
      ))}
    </g>,
  ];
  const layers = maskId
    ? [
        <defs key="defs">
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
            <rect width="1254" height="1254" fill="#fff" />
            {outline("cut", "#000")}
          </mask>
        </defs>,
        <g key="notebook" mask={`url(#${maskId})`}>
          {notebook}
        </g>,
      ]
    : [...notebook, ...(halo ? outline("halo", halo) : [])];

  return (
    <svg width={width} height={height} viewBox={box} className={className} style={style} aria-hidden="true" focusable="false">
      {frame === "icon" && background ? <rect width="1254" height="1254" rx="236" fill={background} /> : null}
      {layers}
      <g transform={PEN_TRANSFORM}>
        {/* var(--logo-pen) só vale como estilo; o next/og prefere o atributo */}
        <g {...(pen.startsWith("var(") ? { style: { fill: pen } } : { fill: pen })}>
          {PEN_PARTS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {/* o brilho do corpo e a ponta da esfera */}
        <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill={LOGO_COLORS.page} />
        <circle cx={0} cy={-4} r={3.2} fill={LOGO_COLORS.band} />
      </g>
    </svg>
  );
}
