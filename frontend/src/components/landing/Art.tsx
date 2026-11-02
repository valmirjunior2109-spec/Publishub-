import { cn } from "@/lib/cn";

/**
 * As ilustrações da marca: formas tiradas do próprio assunto (a curva que cai, a onda da fala, o corte, os quadros
 * do vídeo), em blocos de cor calmos. As cores são fixas: cada tela é uma pequena gravura, igual nos dois temas.
 * São enfeite: não carregam informação, e por isso ficam escondidas dos leitores de tela.
 */
const SAND = "#E7DFD0";
const CLAY = "#C4703F";
const SAGE = "#A9B5A0";
const SLATE = "#8C9BA8";
const INK = "#191816";
const PAPER = "#FAF9F5";

const WAVE = [14, 26, 44, 30, 18, 38, 62, 48, 28, 16, 34, 58, 72, 44, 24, 40, 66, 36, 20, 30, 50, 26, 14];

function Curve() {
  return (
    <>
      <rect width="320" height="240" fill={SAND} />
      <rect x="196" width="124" height="240" fill={CLAY} />
      {[60, 110, 160, 210].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke={INK} strokeOpacity="0.08" />)}
      <path d="M0 62 C60 62 120 66 170 72 C196 76 196 168 226 174 C260 180 290 182 320 186" fill="none" stroke={INK} strokeWidth="3.5" />
      <circle cx="184" cy="96" r="9" fill={PAPER} stroke={INK} strokeWidth="3" />
    </>
  );
}

function Wave() {
  return (
    <>
      <rect width="320" height="240" fill={INK} />
      <rect x="128" y="48" width="84" height="144" rx="6" fill={CLAY} />
      {WAVE.map((h, i) => <rect key={i} x={20 + i * 12.6} y={120 - h} width="6" height={h * 2} rx="3" fill={i >= 9 && i <= 14 ? INK : PAPER} />)}
    </>
  );
}

function Frames() {
  const cells = Array.from({ length: 20 }, (_, i) => i);
  return (
    <>
      <rect width="320" height="240" fill={SAGE} />
      {cells.map((i) => {
        const x = 26 + (i % 5) * 56;
        const y = 22 + Math.floor(i / 5) * 50;
        return <rect key={i} x={x} y={y} width="44" height="38" rx="3" fill={i === 12 ? INK : PAPER} fillOpacity={i === 12 ? 1 : i < 12 ? 0.82 : 0.32} />;
      })}
      <circle cx="160" cy="141" r="8" fill={CLAY} />
    </>
  );
}

function Cut() {
  return (
    <>
      <rect width="320" height="240" fill={SLATE} />
      <rect y="150" width="320" height="90" fill={SAND} />
      <rect x="24" y="84" width="92" height="42" rx="4" fill={INK} />
      <rect x="128" y="84" width="60" height="42" rx="4" fill={PAPER} fillOpacity="0.28" stroke={PAPER} strokeDasharray="5 5" />
      <rect x="200" y="84" width="96" height="42" rx="4" fill={INK} />
      <line x1="122" x2="122" y1="52" y2="190" stroke={CLAY} strokeWidth="3" />
      <line x1="194" x2="194" y1="52" y2="190" stroke={CLAY} strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <line key={i} x1={24 + i * 27.2} x2={24 + i * 27.2} y1="172" y2={i % 5 === 0 ? 200 : 186} stroke={INK} strokeWidth="2" />)}
    </>
  );
}

const TILES = { curve: Curve, wave: Wave, frames: Frames, cut: Cut };

export function ArtTile({ name, className }: { name: keyof typeof TILES; className?: string }) {
  const Tile = TILES[name];
  return (
    <svg aria-hidden="true" viewBox="0 0 320 240" className={cn("block h-auto w-full overflow-hidden rounded-xl", className)}>
      <Tile />
    </svg>
  );
}

/** O fundo das telas do produto: a mesma curva, bem maior, com a régua de tempo na base. */
export function ArtBackdrop({ className }: { className?: string }) {
  const ticks = Array.from({ length: 49 }, (_, i) => i);
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 620" preserveAspectRatio="xMidYMid slice" className={cn("absolute inset-0 h-full w-full", className)}>
      <rect width="1200" height="620" fill="var(--art-ground)" />
      <rect x="760" width="440" height="620" fill="var(--art-block)" />
      <path d="M0 150 C220 150 430 160 620 176 C720 186 720 470 840 486 C960 500 1080 508 1200 516" fill="none" stroke="var(--art-line)" strokeOpacity="0.4" strokeWidth="2" className="max-sm:hidden" />
      {ticks.map((i) => <line key={i} x1={i * 25} x2={i * 25} y1={i % 8 === 0 ? 590 : 602} y2="620" stroke="var(--art-line)" strokeOpacity="0.5" />)}
    </svg>
  );
}
