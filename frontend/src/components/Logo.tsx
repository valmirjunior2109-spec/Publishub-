import { useId } from "react";
import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg";

/* ---------- geometria do "P" (canvas 480×480) ----------
   O P é um "documento" com canto dobrado, três linhas de texto e um play,
   fechado por uma haste e um bojo em degradê verde. Os números abaixo são
   os do arquivo original; quem muda o desenho muda também icon.svg. */
const P_OUTER = "M110 146A68 68 0 0 1 178 78H288A134 134 0 0 1 288 346H240V370A45 45 0 0 1 195 415H155A45 45 0 0 1 110 370Z";
const P_PAGE = "M150 178L212 128H288A84 84 0 0 1 288 296H228L150 372Z";
const P_FOLD = "M150 178H212V128Z";
const P_PLAY = "M268 192L326 232L268 272Z";

/** Só o "P", sem fundo. `viewBox` define o recorte: quadrado (ícone) ou justo (wordmark). */
function PGlyph({ viewBox, className, style }: { viewBox: string; className?: string; style?: React.CSSProperties }) {
  // useId traz ":" ou "«»"; dentro de url(#…) isso quebra em alguns navegadores
  const gradient = `p-grad-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox={viewBox} className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="150" y1="70" x2="300" y2="430">
          <stop offset="0" stopColor="#14E2A9" />
          <stop offset="1" stopColor="#079B86" />
        </linearGradient>
      </defs>
      <path d={P_OUTER} fill={`url(#${gradient})`} />
      <path d={P_PAGE} fill="#FFFFFF" />
      <path d={P_FOLD} fill="#A9EAD6" />
      <g stroke="#12B896" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="#12B896">
        <path d="M175 206H228" />
        <path d="M175 237H248" />
        <path d="M175 268H222" />
        <path d={P_PLAY} />
      </g>
    </svg>
  );
}

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** O ícone: o "P" sozinho, num quadrado de `size` px. */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return <PGlyph viewBox="96 66 340 340" className={cn("block shrink-0", className)} style={{ width: size, height: size }} />;
}

interface LogoProps {
  variant?: "horizontal" | "icon";
  size?: LogoSize;
  /** Texto acessível ("Publishub"), vindo das mensagens. */
  label: string;
  className?: string;
}

const ICON: Record<LogoSize, number> = { sm: 24, md: 32, lg: 40 };
const TEXT: Record<LogoSize, string> = { sm: "text-[19px]", md: "text-[24px]", lg: "text-[32px]" };

/**
 * Marca do Publishub: o "P" desenhado é a primeira letra da palavra —
 * ele senta na linha de base e tem a altura das ascendentes de "ublishub".
 */
export function Logo({ variant = "horizontal", size = "md", label, className }: LogoProps) {
  if (variant === "icon") {
    return (
      <span role="img" aria-label={label} className={cn("inline-flex", className)}>
        <LogoMark size={ICON[size]} />
      </span>
    );
  }
  return (
    <span role="img" aria-label={label} className={cn("inline-flex select-none items-baseline whitespace-nowrap font-sans font-semibold leading-none tracking-[-0.035em] text-ink", TEXT[size], className)}>
      {/* Recorte justo no P (316×341). Como item flex sem linha de base própria, a
          borda inferior do SVG senta na linha de base do texto — em todo navegador.
          Largura explícita: sem ela o Firefox não deduz a proporção do viewBox. */}
      <PGlyph viewBox="108 76 316 341" className="block shrink-0" style={{ height: "0.8em", width: "0.741em", marginRight: "0.02em" }} />
      <span aria-hidden="true" className="block">
        ublishub
      </span>
    </span>
  );
}
