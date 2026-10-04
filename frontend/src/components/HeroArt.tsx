import type { CSSProperties, ReactNode } from "react";
import { Check, Scissors } from "lucide-react";
import { cn } from "@/lib/cn";

/* A paleta da composição (globals.css, --art-*): mais suave que a do texto, com uma versão para cada tema. */
const COLOR = {
  deep: "bg-[var(--art-deep)]",
  accent: "bg-[var(--art-accent)]",
  soft: "bg-[var(--art-soft)]",
  neutral: "bg-[var(--art-neutral)]",
} as const;
type Color = keyof typeof COLOR;

/* Sobre as peças escuras o desenho é claro; sobre as claras e o caramelo, em tinta. */
const INK: Record<Color, string> = { deep: "var(--art-on)", accent: "var(--art-on-accent)", soft: "var(--art-glyph)", neutral: "var(--art-glyph)" };

/* As formas: um quadrado com alguns cantos inteiramente arredondados vira meia-lua, folha, pílula… */
const SHAPE = {
  square: "rounded-[22%]",
  circle: "rounded-full",
  top: "rounded-t-full rounded-b-[22%]",
  bottom: "rounded-b-full rounded-t-[22%]",
  left: "rounded-l-full rounded-r-[22%]",
  right: "rounded-r-full rounded-l-[22%]",
  leaf: "rounded-tl-full rounded-br-full rounded-tr-[22%] rounded-bl-[22%]",
  leafAlt: "rounded-tr-full rounded-bl-full rounded-tl-[22%] rounded-br-[22%]",
  quarter: "rounded-tl-full rounded-[22%]",
} as const;
type Shape = keyof typeof SHAPE;

type Glyph = "scissors" | "timeline" | "wave" | "captions" | "trim" | "film" | "curve" | "play" | "spark" | "dot";

interface Tile {
  shape: Shape;
  color: Color;
  glyph?: Glyph;
  /** Algumas peças flutuam devagar depois de entrar. */
  float?: boolean;
}

/* 5 colunas × 4 linhas: formas calmas em volta, e no meio as ferramentas de edição. */
const TILES: Tile[] = [
  // as peças lisas ficam onde os cards pousam (canto de cima à esquerda, faixa de baixo)
  // e na última coluna, que emoldura a grade
  { shape: "top", color: "neutral" },
  { shape: "circle", color: "soft", float: true },
  { shape: "square", color: "deep", glyph: "scissors" },
  { shape: "square", color: "neutral", glyph: "captions" },
  { shape: "leafAlt", color: "accent" },

  { shape: "bottom", color: "accent" },
  { shape: "square", color: "deep", glyph: "curve" },
  { shape: "square", color: "soft", glyph: "wave" },
  { shape: "square", color: "deep", glyph: "film" },
  { shape: "leaf", color: "soft" },

  { shape: "left", color: "soft", glyph: "dot" },
  { shape: "square", color: "neutral", glyph: "timeline" },
  { shape: "square", color: "accent", glyph: "play" },
  { shape: "circle", color: "deep", glyph: "spark" },
  { shape: "quarter", color: "neutral" },

  { shape: "leaf", color: "deep" },
  { shape: "top", color: "neutral", float: true },
  { shape: "circle", color: "soft" },
  { shape: "square", color: "accent", glyph: "trim" },
  { shape: "circle", color: "deep" },
];

/** Os desenhos de edição, em traço, na cor que contrasta com a peça. */
function GlyphArt({ glyph, ink }: { glyph: Glyph; ink: string }): ReactNode {
  const line = { fill: "none", stroke: ink, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const box = "absolute inset-[20%] h-[60%] w-[60%]";
  switch (glyph) {
    case "scissors":
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <circle cx="26" cy="72" r="13" {...line} />
          <circle cx="74" cy="72" r="13" {...line} />
          <path d="M35 62 L78 14 M65 62 L22 14" {...line} />
        </svg>
      );
    case "timeline":
      // três clipes e o vão do trecho cortado, com a agulha do tempo
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <rect x="4" y="38" width="26" height="24" rx="6" fill={ink} />
          <rect x="44" y="38" width="16" height="24" rx="6" fill="none" stroke={ink} strokeWidth="4" strokeDasharray="4 5" />
          <rect x="70" y="38" width="26" height="24" rx="6" fill={ink} />
          <path d="M37 18 L37 84" stroke="var(--art-accent)" strokeWidth="5" strokeLinecap="round" />
          <path d="M29 14 L45 14 L37 24 Z" fill="var(--art-accent)" />
        </svg>
      );
    case "wave":
      // a fala e, no meio, a pausa marcada para sair
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <rect x="40" y="10" width="22" height="80" rx="8" fill="var(--art-accent)" opacity="0.22" />
          {[8, 18, 28, 70, 80, 90].map((x, i) => (
            <path key={x} d={`M${x} ${50 - [14, 28, 18, 24, 12, 20][i]} L${x} ${50 + [14, 28, 18, 24, 12, 20][i]}`} {...line} />
          ))}
          <path d="M46 50 L56 50" {...line} strokeDasharray="1 8" />
        </svg>
      );
    case "captions":
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <text x="50" y="46" textAnchor="middle" fontSize="40" fontWeight="800" fill={ink} fontFamily="inherit">
            Aa
          </text>
          <rect x="10" y="62" width="80" height="9" rx="4.5" fill={ink} />
          <rect x="24" y="80" width="52" height="9" rx="4.5" fill={ink} opacity="0.55" />
        </svg>
      );
    case "trim":
      // as alças de corte em volta de um trecho
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <rect x="22" y="40" width="56" height="20" rx="4" fill={ink} opacity="0.35" />
          <path d="M26 22 L14 22 L14 78 L26 78 M74 22 L86 22 L86 78 L74 78" {...line} strokeWidth={8} />
        </svg>
      );
    case "film":
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <rect x="16" y="6" width="68" height="88" rx="10" {...line} />
          {[20, 40, 60, 80].map((y) => (
            <g key={y}>
              <rect x="22" y={y - 5} width="8" height="8" rx="2" fill={ink} />
              <rect x="70" y={y - 5} width="8" height="8" rx="2" fill={ink} />
            </g>
          ))}
          <path d="M42 38 L60 50 L42 62 Z" fill={ink} />
        </svg>
      );
    case "curve":
      // a curva de retenção da marca: estável, a queda num segundo marcado
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <path d="M4 26 L36 30 L46 64 L96 74" {...line} />
          <line x1="41" y1="8" x2="41" y2="94" stroke="var(--art-accent)" strokeWidth="4" strokeDasharray="7 7" />
          <circle cx="41" cy="46" r="9" fill="var(--art-accent)" />
        </svg>
      );
    case "play":
      // o play e a barra de tempo sem o trecho parado
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <path d="M34 18 L76 44 L34 70 Z" fill={ink} />
          <rect x="4" y="84" width="36" height="8" rx="4" fill={ink} />
          <rect x="60" y="84" width="36" height="8" rx="4" fill={ink} />
        </svg>
      );
    case "spark":
      // o brilho da sugestão: a IA aponta, não corta
      return (
        <svg viewBox="0 0 100 100" className={box} aria-hidden="true">
          <path d="M50 8 C54 36 64 46 92 50 C64 54 54 64 50 92 C46 64 36 54 8 50 C36 46 46 36 50 8 Z" fill={ink} />
        </svg>
      );
    case "dot":
      return <span className="absolute inset-[28%] rounded-full bg-[var(--art-glyph)]" />;
  }
}

export interface HeroArtLabels {
  /** "0:04 · −32%" */
  drop: string;
  /** "queda de retenção" */
  dropCaption: string;
  /** "Corte sugerido" */
  cut: string;
  /** "−2,3s · alta confiança" */
  cutDetail: string;
  /** "Aceitar" */
  accept: string;
  /** "Exemplo" */
  example: string;
}

/**
 * A composição do hero: formas simples nas cores da marca e, no meio, as
 * ferramentas de edição (tesoura, linha do tempo, onda, legendas, alças de corte,
 * película), com dois cards do produto flutuando por cima — a queda que a análise
 * encontra e o corte que ela sugere para o criador aceitar. Os números são de
 * exemplo, e o card diz isso.
 *
 * Só CSS: as peças entram em sequência (`.tile-in`) e algumas flutuam devagar
 * (`.float-slow`), sempre em transform/opacity; tudo parado quando o sistema pede
 * menos movimento. A parte desenhada é decorativa; os cards têm texto real.
 */
export function HeroArt({ labels, className }: { labels: HeroArtLabels; className?: string }) {
  return (
    <div className={cn("relative w-full", className)}>
      <div aria-hidden="true" className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {TILES.map((tile, index) => (
          <div key={index} className="tile-in relative aspect-square" style={{ "--tile-delay": `${index * 40}ms` } as CSSProperties}>
            <div className={cn("absolute inset-0", COLOR[tile.color], SHAPE[tile.shape], tile.float && "float-slow")} style={{ "--float-delay": `${index * 200}ms` } as CSSProperties}>
              {tile.glyph && <GlyphArt glyph={tile.glyph} ink={INK[tile.color]} />}
            </div>
          </div>
        ))}
      </div>

      {/* os cards do produto, por cima: o que a análise encontra e o que ela sugere */}
      {/* no celular a grade é pequena: fica só o card do corte, que é o que o produto faz */}
      <div className="tile-in absolute -left-10 top-[3%] hidden sm:block" style={{ "--tile-delay": "900ms" } as CSSProperties}>
        <div className="float-slow flex items-center gap-3 rounded-2xl border border-line bg-paper-raised px-3.5 py-2.5 shadow-lift" style={{ "--float-delay": "300ms" } as CSSProperties}>
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(var(--accent-rgb),0.14)]">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-display text-[15px] font-bold tabular-nums tracking-tight">{labels.drop}</span>
              <span className="rounded-full border border-line px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ink-muted">{labels.example}</span>
            </span>
            <span className="block text-[12px] text-ink-muted">{labels.dropCaption}</span>
          </span>
        </div>
      </div>

      <div className="tile-in absolute -bottom-7 -left-2 sm:-left-6" style={{ "--tile-delay": "1100ms" } as CSSProperties}>
        <div className="float-slow flex items-center gap-3 rounded-2xl border border-line bg-paper-raised px-3.5 py-2.5 shadow-lift" style={{ "--float-delay": "1400ms" } as CSSProperties}>
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <Scissors size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">{labels.cut}</span>
            <span className="block text-[12px] tabular-nums text-ink-muted">{labels.cutDetail}</span>
          </span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-paper-raised">
            <Check size={13} strokeWidth={2.5} aria-hidden="true" />
            {labels.accept}
          </span>
        </div>
      </div>
    </div>
  );
}
