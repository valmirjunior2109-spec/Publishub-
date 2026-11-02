/* O logo da Publishub com a borda das páginas atravessando o caderno (a versão
   corrigida dos arquivos de marca): mesmas medidas de frontend/src/components/LogoArt.tsx,
   o respiro da caneta recortado e o elástico por cima das páginas. */

const PEN = "translate(651 888) rotate(24.4)";
const PARTS = [
  "M0 0 C 7 -22, 20 -62, 20 -106 L -20 -106 C -20 -62, -7 -22, 0 0 Z",
  "M-20 -116 H20 C 20 -138, 10.5 -150, 10.5 -168 H-10.5 C -10.5 -150, -20 -138, -20 -116 Z",
  "M-10.5 -167 H10.5 V-335 H-10.5 Z",
  "M-23.5 -345 H23.5 V-517.5 A23.5 23.5 0 0 0 -23.5 -517.5 Z",
  "M38 -302 A8 8 0 0 1 54 -302 V-480 Q54 -486 48 -486 H21.5 V-470 H38 Z",
];

export function Mark({ height, id }: { height: number; id: string }) {
  return (
    <svg viewBox="405 368 500 524" width={(height * 500) / 524} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
          <rect width="1254" height="1254" fill="#fff" />
          <g transform={PEN} fill="#000" stroke="#000" strokeWidth={38} strokeLinejoin="round">
            {PARTS.map((d) => <path key={d} d={d} />)}
          </g>
          <g transform={PEN} fill="#000">
            <rect x={-42.5} y={-345} width={13} height={19} />
            <rect x={29.5} y={-345} width={13} height={19} />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <rect x={409} y={372} width={352} height={516} rx={60} fill="#C9824A" />
        <path d="M463.5 795 H706.5 A27.5 27.5 0 0 1 706.5 850 H463.5 A27.5 27.5 0 0 1 463.5 795 Z" fill="#FBF3E6" />
        <rect x={657} y={372} width={37} height={516} fill="#1E1B18" />
      </g>
      <g transform={PEN}>
        <g fill="#1F47A6">{PARTS.map((d) => <path key={d} d={d} />)}</g>
        <rect x={-2.2} y={-309} width={4.4} height={115} rx={2.2} fill="#FBF3E6" />
        <circle cx={0} cy={-4} r={3.2} fill="#1E1B18" />
      </g>
    </svg>
  );
}

/** O logo horizontal do site: símbolo com 1,3× a altura do texto, 0,4em de distância, Geist 600, -0.035em. */
export function Lockup({ size, id, color = "#1E1B18" }: { size: number; id: string; color?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, lineHeight: 1, whiteSpace: "nowrap" }}>
      <Mark height={size * 1.3} id={id} />
      <span style={{ fontFamily: "Geist, system-ui, sans-serif", fontWeight: 600, fontSize: size, letterSpacing: "-0.035em", color }}>Publishub</span>
    </div>
  );
}
