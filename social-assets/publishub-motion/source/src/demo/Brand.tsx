import { FONT } from "../theme";

/* O caderno com a caneta, com as medidas de frontend/src/components/LogoArt.tsx
   (o logo atual do site; o Logo.tsx deste projeto é a versão antiga, simplificada).
   `build` (0 → 1): o caderno sobe e aparece, a borda das páginas se desenha e a
   caneta desliza pelo próprio eixo até o lugar. */

const VB = { x: 405, y: 368, w: 500, h: 524 };
const PEN = "translate(651 888) rotate(24.4)";
const HALO = 19;
const PARTS = [
  "M0 0 C 7 -22, 20 -62, 20 -106 L -20 -106 C -20 -62, -7 -22, 0 0 Z",
  "M-20 -116 H20 C 20 -138, 10.5 -150, 10.5 -168 H-10.5 C -10.5 -150, -20 -138, -20 -116 Z",
  "M-10.5 -167 H10.5 V-335 H-10.5 Z",
  "M-23.5 -345 H23.5 V-517.5 A23.5 23.5 0 0 0 -23.5 -517.5 Z",
  "M38 -302 A8 8 0 0 1 54 -302 V-480 Q54 -486 48 -486 H21.5 V-470 H38 Z",
];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const out = (t: number) => 1 - Math.pow(1 - t, 3);

export function BrandMark({ height, build = 1, pen = "#1F47A6", id }: { height: number; build?: number; pen?: string; id: string }) {
  const body = out(clamp(build / 0.5));
  const page = out(clamp((build - 0.3) / 0.4));
  const penIn = out(clamp((build - 0.4) / 0.6));
  const slide = (1 - penIn) * 260; // ao longo do eixo da caneta, de cima
  return (
    <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} width={(height * VB.w) / VB.h} height={height} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
          <rect width="1254" height="1254" fill="#fff" />
          <g transform={`${PEN} translate(0 ${-slide})`} opacity={penIn > 0 ? 1 : 0}>
            <g fill="#000" stroke="#000" strokeWidth={HALO * 2} strokeLinejoin="round">
              {PARTS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <rect x={-42.5} y={-345} width={13} height={HALO} fill="#000" />
            <rect x={29.5} y={-345} width={13} height={HALO} fill="#000" />
          </g>
        </mask>
        <clipPath id={`${id}-page`}>
          <rect x={436} y={790} width={221 * page} height={64} />
        </clipPath>
      </defs>
      <g mask={`url(#${id}-cut)`} opacity={body} transform={`translate(0 ${(1 - body) * 40})`}>
        <rect x={409} y={372} width={352} height={516} rx={60} fill="#C9824A" />
        <rect x={657} y={372} width={37} height={516} fill="#1E1B18" />
        <path d="M463.5 795 H657 V850 H463.5 A27.5 27.5 0 0 1 463.5 795 Z" fill="#FBF3E6" clipPath={`url(#${id}-page)`} />
      </g>
      <g transform={`${PEN} translate(0 ${-slide})`} opacity={penIn}>
        {PARTS.map((d) => (
          <path key={d} d={d} fill={pen} />
        ))}
        <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill="#FBF3E6" />
        <circle cx={0} cy={-4} r={3.2} fill="#1E1B18" />
      </g>
    </svg>
  );
}

/** O logo horizontal, como no site: símbolo com 1,3 vez o corpo, 0,4 em de distância. */
export function BrandLockup({ size, build = 1, word = 1, color = "#1E1B18", id }: { size: number; build?: number; word?: number; color?: string; id: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, fontSize: size, lineHeight: 1, color, whiteSpace: "nowrap" }}>
      <BrandMark height={size * 1.3} build={build} id={id} />
      <span
        style={{
          fontFamily: FONT.sans,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          display: "inline-block",
          clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
          transform: `translateX(${(1 - word) * -0.2}em)`,
        }}
      >
        Publishub
      </span>
    </div>
  );
}
