import { cn } from "@/lib/cn";

/**
 * A linguagem 8-bit do Publishub em componentes pequenos: ícones de status desenhados em
 * pixel (7 x 7, na cor do texto) e o indicador de carregamento em blocos.
 * Os ícones são decorativos: o status sempre vem escrito ao lado (nunca só pela cor).
 */

const ICONS = {
  pass: [".......", "......X", ".....X.", "X...X..", ".X.X...", "..X....", "......."],
  fail: ["X.....X", ".X...X.", "..X.X..", "...X...", "..X.X..", ".X...X.", "X.....X"],
  inconclusive: [".XXXX..", "X....X.", ".....X.", "...XX..", "...X...", ".......", "...X..."],
  running: [".X.....", ".XX....", ".XXX...", ".XXXX..", ".XXX...", ".XX....", ".X....."],
  star: ["...X...", "...X...", "..XXX..", "XXXXXXX", "..XXX..", "...X...", "...X..."],
} as const;

export type PixelIconName = keyof typeof ICONS;

/** Junta os pixels de cada linha em retângulos (menos nós no SVG). */
function rects(rows: readonly string[]) {
  const out: [number, number, number][] = [];
  rows.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      if (row[x] === "X" && start < 0) start = x;
      if (row[x] !== "X" && start >= 0) {
        out.push([start, y, x - start]);
        start = -1;
      }
    }
  });
  return out;
}

export function PixelIcon({ name, size = 14, className }: { name: PixelIconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      {rects(ICONS[name]).map(([x, y, w]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Carregando: três blocos que acendem em sequência. Decorativo: o texto do botão diz o que está acontecendo. */
export function PixelLoader({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("pixel-loader", className)}>
      <span />
      <span />
      <span />
    </span>
  );
}
