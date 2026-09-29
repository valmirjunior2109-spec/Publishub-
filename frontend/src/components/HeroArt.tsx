import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* As cores da composição: os tokens do site, então o desenho acompanha o tema claro e o escuro. */
const COLOR = {
  ink: "bg-ink",
  accent: "bg-accent",
  soft: "bg-accent-soft",
  gray: "bg-[rgba(var(--ink-rgb),0.13)]",
  paper: "bg-paper-raised",
} as const;
type Color = keyof typeof COLOR;

/* As formas: um quadrado com alguns cantos inteiramente arredondados vira meia-lua, folha, pílula… */
const SHAPE = {
  square: "",
  circle: "rounded-full",
  top: "rounded-t-full",
  bottom: "rounded-b-full",
  left: "rounded-l-full",
  right: "rounded-r-full",
  leaf: "rounded-tl-full rounded-br-full",
  leafAlt: "rounded-tr-full rounded-bl-full",
  quarter: "rounded-tl-full",
} as const;
type Shape = keyof typeof SHAPE;

interface Tile {
  shape: Shape;
  color: Color;
  /** O que vai dentro da peça: um círculo, uma folha, a curva ou o play. */
  inner?: "dot" | "leaf" | "curve" | "play" | "ring";
  innerColor?: Color;
  /** Algumas peças flutuam devagar depois de entrar. */
  float?: boolean;
}

/* 4 colunas × 5 linhas: a leitura vai do cinza calmo ao verde da marca, com a curva e o corte no meio. */
const TILES: Tile[] = [
  { shape: "top", color: "gray", inner: "leaf", innerColor: "paper" },
  { shape: "bottom", color: "ink" },
  { shape: "square", color: "gray", inner: "dot", innerColor: "ink" },
  { shape: "leafAlt", color: "accent", float: true },

  { shape: "bottom", color: "accent" },
  { shape: "square", color: "ink", inner: "curve" },
  { shape: "leaf", color: "soft" },
  { shape: "right", color: "ink" },

  { shape: "left", color: "soft", inner: "dot", innerColor: "ink" },
  { shape: "circle", color: "ink" },
  { shape: "square", color: "accent", inner: "play" },
  { shape: "quarter", color: "gray" },

  { shape: "circle", color: "gray", float: true },
  { shape: "right", color: "accent", inner: "ring", innerColor: "paper" },
  { shape: "square", color: "ink", inner: "dot", innerColor: "soft" },
  { shape: "left", color: "soft" },

  { shape: "leaf", color: "ink" },
  { shape: "top", color: "gray" },
  { shape: "right", color: "accent", inner: "dot", innerColor: "ink" },
  { shape: "circle", color: "soft", float: true },
];

/** A curva de retenção da marca, em miniatura: estável, a queda num segundo marcado, e o resto. */
function MiniCurve() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-[16%] h-[68%] w-[68%]" aria-hidden="true">
      <path d="M4 26 L36 30 L46 64 L96 74" fill="none" stroke="var(--paper-raised)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="41" y1="8" x2="41" y2="94" stroke="var(--accent)" strokeWidth="4" strokeDasharray="7 7" />
      <circle cx="41" cy="46" r="9" fill="var(--accent)" />
    </svg>
  );
}

/** Um play com um pedaço "cortado" da barra de tempo: o vídeo sem o trecho parado. */
function PlayCut() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-[18%] h-[64%] w-[64%]" aria-hidden="true">
      <path d="M34 22 L74 46 L34 70 Z" fill="var(--paper-raised)" />
      <rect x="6" y="84" width="34" height="8" rx="4" fill="var(--paper-raised)" />
      <rect x="60" y="84" width="34" height="8" rx="4" fill="var(--paper-raised)" />
      <path d="M46 80 L54 96 M54 80 L46 96" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Inner({ tile }: { tile: Tile }): ReactNode {
  const color = COLOR[tile.innerColor ?? "paper"];
  switch (tile.inner) {
    case "dot":
      return <span className={cn("absolute inset-[27%] rounded-full", color)} />;
    case "ring":
      return <span className="absolute inset-[28%] rounded-full border-[6px] border-paper-raised sm:border-[8px]" />;
    case "leaf":
      return <span className={cn("absolute inset-[26%] rounded-tl-full rounded-br-full", color)} />;
    case "curve":
      return <MiniCurve />;
    case "play":
      return <PlayCut />;
    default:
      return null;
  }
}

/** Um trevo de quatro folhas, como os que flutuam em volta da grade. */
function Petals({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={cn("grid grid-cols-2 gap-[2px]", className)} style={style}>
      <span className="rounded-tl-full rounded-br-full bg-ink" />
      <span className="rounded-tr-full rounded-bl-full bg-ink" />
      <span className="rounded-tr-full rounded-bl-full bg-ink" />
      <span className="rounded-tl-full rounded-br-full bg-ink" />
    </span>
  );
}

/**
 * A composição geométrica do hero: formas simples nas cores da marca, com duas
 * peças que contam o produto (a curva que cai num segundo marcado e o play com
 * um trecho cortado). Decorativa: leitores de tela não precisam dela.
 *
 * Só CSS: cada peça entra em sequência (`.tile-in`) e algumas flutuam devagar
 * (`.float-slow`); tudo parado quando o sistema pede menos movimento.
 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative mx-auto w-full max-w-[460px]", className)}>
      {/* os soltos, em volta da grade: por fora entram, por dentro flutuam (duas animações, dois elementos) */}
      <span className="tile-in absolute -left-6 top-6 sm:-left-10" style={{ "--tile-delay": "900ms" } as CSSProperties}>
        <span className="float-slow block h-7 w-7 rounded-full bg-[rgba(var(--ink-rgb),0.18)]" style={{ "--float-delay": "400ms" } as CSSProperties} />
      </span>
      <span className="tile-in absolute -left-9 top-[36%] hidden sm:block" style={{ "--tile-delay": "1000ms" } as CSSProperties}>
        <Petals className="spin-slow h-12 w-12" />
      </span>
      <span className="tile-in absolute -bottom-5 left-[22%]" style={{ "--tile-delay": "1100ms" } as CSSProperties}>
        <span className="float-slow block h-6 w-6 rounded-full bg-accent" style={{ "--float-delay": "1200ms" } as CSSProperties} />
      </span>

      <div className="grid grid-cols-4">
        {TILES.map((tile, index) => (
          <div key={index} className="tile-in relative aspect-square" style={{ "--tile-delay": `${index * 45}ms` } as CSSProperties}>
            <div className={cn("absolute inset-0", COLOR[tile.color], SHAPE[tile.shape], tile.float && "float-slow")} style={{ "--float-delay": `${index * 180}ms` } as CSSProperties}>
              <Inner tile={tile} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
