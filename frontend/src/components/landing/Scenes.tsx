import type { CSSProperties, ReactNode } from "react";
import { InViewPlay } from "@/components/landing/InViewPlay";
import { cn } from "@/lib/cn";

/* As cores do logo (components/LogoArt.tsx) e dois tons naturais para acompanhar. São
   fixas de propósito: cada cena é uma pequena gravura, igual no tema claro e no escuro. */
const CLAY = "#C9824A";
const INK = "#1E1B18";
const CREAM = "#FBF3E6";
const PEN = "#1F47A6";
const OAT = "#E8DCC6";
const SAGE = "#A9B39B";
const SAND = "#E9D3B4";

const WAVE = [22, 40, 62, 34, 52, 78, 58, 30, 46, 70, 84, 50, 28, 44, 24];
const LOOP = { repeatCount: "indefinite" } as const;

/* cada cena tem 200 × 200 e conta um pedaço do trabalho de editar */
function Curve() {
  const line = "M12 56 C 60 58 88 60 104 70 C 120 80 116 146 138 154 C 158 160 174 162 190 164";
  return (
    <>
      <rect width="200" height="200" fill={CLAY} />
      <path d={line} pathLength={1} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeDasharray="1">
        <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.55;1" dur="7s" {...LOOP} />
      </path>
      <circle r="8" fill={CREAM} stroke={INK} strokeWidth="3">
        <animateMotion path={line} keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="linear" dur="7s" {...LOOP} />
      </circle>
    </>
  );
}

function Wave() {
  return (
    <>
      <rect width="200" height="200" fill={INK} />
      {WAVE.map((height, index) => (
        <rect key={index} className="scene-bar" x={21 + index * 11} y={100 - height} width="5" height={height * 2} rx="2.5" fill={index > 8 && index < 12 ? CLAY : CREAM} style={{ "--b": `${index * -0.17}s` } as CSSProperties} />
      ))}
    </>
  );
}

function Frames() {
  return (
    <>
      <rect width="200" height="200" fill={SAGE} />
      {Array.from({ length: 16 }, (_, index) => (
        <rect key={index} x={20 + (index % 4) * 42} y={20 + Math.floor(index / 4) * 42} width="34" height="34" rx="3" fill={CREAM} fillOpacity={0.82} />
      ))}
      <rect width="34" height="34" rx="3" fill={INK}>
        <animate attributeName="x" calcMode="discrete" values="62;146;20;104;62" dur="6s" {...LOOP} />
        <animate attributeName="y" calcMode="discrete" values="62;20;104;146;62" dur="6s" {...LOOP} />
      </rect>
    </>
  );
}

function Cut() {
  return (
    <>
      <rect width="200" height="200" fill={OAT} />
      <rect x="18" y="78" width="66" height="44" rx="5" fill={INK} />
      <rect x="84" y="78" width="36" height="44" fill={CLAY}>
        <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.35;0.5;0.95;1" dur="6s" {...LOOP} />
      </rect>
      <rect x="120" y="78" width="62" height="44" rx="5" fill={INK}>
        <animateTransform attributeName="transform" type="translate" values="0;0;-36;-36;0" keyTimes="0;0.45;0.62;0.95;1" dur="6s" {...LOOP} />
      </rect>
      <line x1="84" x2="84" y1="54" y2="146" stroke={PEN} strokeWidth="2.5" />
    </>
  );
}

function PenMark() {
  return (
    <>
      <rect width="200" height="200" fill={SAND} />
      <text x="100" y="116" textAnchor="middle" fontSize="44" fill={INK} className="font-serif">
        0:04
      </text>
      <path d="M46 92 C 52 58 150 50 164 88 C 176 128 72 150 42 118 C 30 102 58 74 96 68" pathLength={1} fill="none" stroke={PEN} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1">
        <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.4;1" dur="6s" {...LOOP} />
      </path>
    </>
  );
}

function Notebook() {
  return (
    <>
      <rect width="200" height="200" fill={CLAY} />
      <rect x="40" y="26" width="120" height="148" rx="8" fill={CREAM} />
      <rect x="136" y="26" width="10" height="148" fill={INK} />
      {[56, 78, 100, 122, 144].map((y, index) => (
        <path key={y} d={`M54 ${y} H${index % 2 ? 112 : 126}`} pathLength={1} stroke={index === 2 ? PEN : INK} strokeWidth="3" strokeLinecap="round" strokeDasharray="1">
          <animate attributeName="stroke-dashoffset" values={`1;1;0;0;1`} keyTimes={`0;${0.06 + index * 0.1};${0.16 + index * 0.1};0.94;1`} dur="7s" {...LOOP} />
        </path>
      ))}
    </>
  );
}

function Play() {
  return (
    <>
      <rect width="200" height="200" fill={PEN} />
      {[0, 1].map((index) => (
        <circle key={index} cx="100" cy="100" r="34" fill="none" stroke={CREAM} strokeWidth="1.5">
          <animate attributeName="r" values="34;86" dur="4s" begin={`${index * -2}s`} {...LOOP} />
          <animate attributeName="opacity" values="0.8;0" dur="4s" begin={`${index * -2}s`} {...LOOP} />
        </circle>
      ))}
      <circle cx="100" cy="100" r="34" fill={CREAM} />
      <path d="M90 82 L120 100 L90 118 Z" fill={INK} />
    </>
  );
}

function Checklist() {
  return (
    <>
      <rect width="200" height="200" fill={OAT} />
      {[48, 88, 128].map((y, index) => (
        <g key={y}>
          <rect x="34" y={y} width="24" height="24" rx="5" fill={CREAM} stroke={INK} strokeWidth="2" />
          <path d={`M70 ${y + 12} H${index === 1 ? 138 : 166}`} stroke={INK} strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
          <path d={`M39 ${y + 12} l5 6 l10 -12`} pathLength={1} fill="none" stroke={PEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1">
            <animate attributeName="stroke-dashoffset" values="1;1;0;0;1" keyTimes={`0;${0.1 + index * 0.2};${0.18 + index * 0.2};0.94;1`} dur="7s" {...LOOP} />
          </path>
        </g>
      ))}
    </>
  );
}

function Playhead() {
  return (
    <>
      <rect width="200" height="200" fill={INK} />
      {[58, 96, 134].map((y, row) => (
        <g key={y}>
          <rect x="20" y={y} width={row === 1 ? 54 : 88} height="22" rx="4" fill={row === 1 ? CLAY : OAT} />
          <rect x={row === 1 ? 80 : 114} y={y} width={row === 1 ? 100 : 66} height="22" rx="4" fill={row === 2 ? SAGE : OAT} />
        </g>
      ))}
      <line y1="36" y2="172" stroke={CREAM} strokeWidth="2.5">
        <animate attributeName="x1" values="20;180" dur="6s" {...LOOP} />
        <animate attributeName="x2" values="20;180" dur="6s" {...LOOP} />
      </line>
    </>
  );
}

function Reel() {
  return (
    <>
      <rect width="200" height="200" fill={SAGE} />
      <rect x="62" y="18" width="76" height="164" rx="12" fill={INK} />
      <rect x="68" y="24" width="64" height="152" rx="7" fill={CLAY} />
      <circle cx="100" cy="78" r="17" fill={CREAM} />
      <path d="M72 148 C 78 112 122 112 128 148 Z" fill={CREAM} />
      <rect x="76" y="162" width="48" height="4" rx="2" fill={CREAM} fillOpacity="0.45" />
      <rect x="76" y="162" width="48" height="4" rx="2" fill={INK}>
        <animate attributeName="width" values="0;48" dur="6s" {...LOOP} />
      </rect>
    </>
  );
}

function Talk() {
  return (
    <>
      <rect width="200" height="200" fill={CLAY} />
      <path d="M34 54 a14 14 0 0 1 14 -14 H152 a14 14 0 0 1 14 14 V124 a14 14 0 0 1 -14 14 H92 L60 166 V138 H48 a14 14 0 0 1 -14 -14 Z" fill={CREAM} />
      {[72, 100, 128].map((cx, index) => (
        <circle key={cx} className="scene-dot" cx={cx} cy="89" r="8" fill={INK} style={{ "--b": `${index * 0.22}s` } as CSSProperties} />
      ))}
    </>
  );
}

function Rings() {
  return (
    <>
      <rect width="200" height="200" fill={OAT} />
      {[78, 58, 38].map((r, index) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray={index === 1 ? "3 7" : undefined}>
          {index === 1 && <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="24s" {...LOOP} />}
        </circle>
      ))}
      <circle cx="100" cy="100" r="15" fill={CLAY} />
      <circle r="6" fill={PEN}>
        <animateMotion path="M100 22 a78 78 0 1 1 -0.1 0" dur="9s" {...LOOP} />
      </circle>
    </>
  );
}

const SCENES = { curve: Curve, wave: Wave, frames: Frames, cut: Cut, pen: PenMark, notebook: Notebook, play: Play, checklist: Checklist, playhead: Playhead, reel: Reel, talk: Talk, rings: Rings };
type SceneName = keyof typeof SCENES;

export function Scene({ name, className, style }: { name: SceneName; className?: string; style?: CSSProperties }): ReactNode {
  const Drawing = SCENES[name];
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" data-hold="5" className={cn("block overflow-hidden rounded-[10px] shadow-[0_0_0_1px_rgba(251,243,230,0.1)]", className)} style={style}>
      <Drawing />
    </svg>
  );
}

/* onde cada cena fica em volta do título, nas telas largas: duas colunas de cada lado, sem chegar ao texto */
const PLACED: { name: SceneName; side: "left" | "right"; x: string; top: number; size: number }[] = [
  { name: "rings", side: "left", x: "1.5%", top: 24, size: 116 },
  { name: "curve", side: "left", x: "1.5%", top: 186, size: 150 },
  { name: "checklist", side: "left", x: "1.5%", top: 382, size: 112 },
  { name: "reel", side: "left", x: "1.5%", top: 540, size: 138 },
  { name: "pen", side: "left", x: "12.5%", top: 86, size: 98 },
  { name: "wave", side: "left", x: "13.5%", top: 396, size: 104 },
  { name: "frames", side: "right", x: "1.5%", top: 30, size: 142 },
  { name: "play", side: "right", x: "1.5%", top: 218, size: 108 },
  { name: "notebook", side: "right", x: "1.5%", top: 372, size: 150 },
  { name: "cut", side: "right", x: "1.5%", top: 568, size: 112 },
  { name: "playhead", side: "right", x: "13%", top: 122, size: 100 },
  { name: "talk", side: "right", x: "13.5%", top: 452, size: 96 },
];

/* a faixa do celular tem menos cenas: a mesma variedade, gastando menos bateria */
const ROW: SceneName[] = ["curve", "pen", "wave", "frames", "play", "notebook", "cut", "talk"];

/**
 * As cenas em volta do título, flutuando devagar. Em tela estreita não há espaço dos
 * lados, e elas passam numa faixa embaixo do título. São enfeite: não carregam
 * informação, e por isso ficam escondidas dos leitores de tela.
 */
export function HeroCollage() {
  return (
    <>
      <InViewPlay className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block">
        {PLACED.map(({ name, side, x, top, size }, index) => (
          <Scene key={name} name={name} className="drift absolute" style={{ [side]: x, top, width: size, height: size, "--d": `${11 + (index % 5) * 2}s`, "--dl": `${index * -1.3}s` } as CSSProperties} />
        ))}
      </InViewPlay>
      <InViewPlay className="relative mt-10 overflow-hidden sm:mt-12 xl:hidden">
        <div className="collage-row flex w-max gap-3">
          {[...ROW, ...ROW].map((name, index) => (
            <Scene key={`${name}-${index}`} name={name} className="h-[104px] w-[104px] shrink-0 sm:h-[128px] sm:w-[128px]" />
          ))}
        </div>
      </InViewPlay>
    </>
  );
}
