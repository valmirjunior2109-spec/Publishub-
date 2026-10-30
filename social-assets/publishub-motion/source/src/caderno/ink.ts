/* Caneta no papel: geometria dos traços à mão, medida de texto e a posição da ponta. */

export type Pt = [number, number];

/** Aleatório determinístico: o mesmo traço em todo render. */
export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Treme cada ponto um pouco, como a mão. */
export function shaky(pts: Pt[], amt: number, seed: number): Pt[] {
  const r = rng(seed);
  return pts.map(([x, y], i) => (i === 0 || i === pts.length - 1 ? [x + (r() - 0.5) * amt * 0.5, y + (r() - 0.5) * amt * 0.5] : [x + (r() - 0.5) * amt, y + (r() - 0.5) * amt]));
}

export function line(a: Pt, b: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as Pt);
}

/** Elipse à mão: passa um pouco do começo, como quem circula rápido. */
export function ellipse(c: Pt, rx: number, ry: number, { start = -2.4, sweep = Math.PI * 2.18, n = 64, tilt = -0.06 } = {}): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = start + (sweep * i) / n;
    const grow = 1 + 0.06 * (i / n); // a volta final abre um pouco
    const x = Math.cos(a) * rx * grow;
    const y = Math.sin(a) * ry * grow;
    return [c[0] + x * Math.cos(tilt) - y * Math.sin(tilt), c[1] + x * Math.sin(tilt) + y * Math.cos(tilt)] as Pt;
  });
}

export function tick(x: number, y: number, s = 1): Pt[] {
  return [
    [x, y],
    [x + 7 * s, y + 7 * s],
    [x + 14 * s, y + 14 * s],
    [x + 26 * s, y - 8 * s],
    [x + 40 * s, y - 30 * s],
    [x + 50 * s, y - 44 * s],
  ];
}

/** A ponta da seta: duas pernas e o vértice em `b`, vindo de `a`. */
export function arrowHead(a: Pt, b: Pt, size = 28): Pt[] {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const l: Pt = [b[0] - size * Math.cos(ang - 0.5), b[1] - size * Math.sin(ang - 0.5)];
  const r: Pt = [b[0] - size * Math.cos(ang + 0.5), b[1] - size * Math.sin(ang + 0.5)];
  return [l, b, r];
}

export function wave(x1: number, x2: number, y: number, amp = 8, period = 34): Pt[] {
  const n = Math.max(8, Math.round((x2 - x1) / 6));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x1 + ((x2 - x1) * i) / n;
    return [x, y + Math.sin(((x - x1) / period) * Math.PI * 2) * amp] as Pt;
  });
}

export function rotAround([x, y]: Pt, [cx, cy]: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Caminho suave pelos pontos (quadráticas pelos pontos médios). */
export function pathD(pts: Pt[]): string {
  if (pts.length < 3) return `M${pts.map((p) => p.join(" ")).join(" L")}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** O ponto a `p` (0…1) do comprimento da polilinha. */
export function along(pts: Pt[], p: number): Pt {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  let want = Math.min(1, Math.max(0, p)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, want / seg[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    want -= seg[i];
  }
  return pts[pts.length - 1];
}

const widths = new Map<string, number>();
let ctx: CanvasRenderingContext2D | null = null;

/** Largura do texto na fonte dada (canvas do navegador do render; as fontes já carregaram). */
export function measure(text: string, font: string): number {
  const key = `${font}|${text}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;
  if (!ctx && typeof document !== "undefined") ctx = document.createElement("canvas").getContext("2d");
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  let w = text.length * size * 0.45;
  if (ctx) {
    ctx.font = font;
    w = ctx.measureText(text).width;
    // só guarda depois que a fonte carregou: antes disso a medida é a da fonte reserva
    if (document.fonts?.check(font)) widths.set(key, w);
  }
  return w;
}
