/* ==========================================================================
   Publishub · motion ad v2: o tema escuro do site, a copy e o Reel de exemplo
   --------------------------------------------------------------------------
   A v2 vive no modo escuro da Publishub (frontend/src/app/globals.css, bloco
   prefers-color-scheme: dark): papel escuro, tinta creme e a caneta azul-clara.
   O Reel analisado é feito de clipes reais do Mixkit (public/footage/CREDITS.md).
   ========================================================================== */

export const D = {
  paper: "#17140F",
  raised: "#201C17",
  surface: "#26211B",
  ink: "#F4ECDF",
  muted: "#B3A797",
  line: "#3A322A",
  accent: "#8FAAF0", // a caneta no tema escuro
  accentStrong: "#B0C4F5",
  accentSoft: "#1E2840",
  onAccent: "#17140F",
  confirmed: "#7FC48A",
  black: "#0C0A08",
  caramel: "#C9824A",
};

export const COPY = {
  hook1: "You spend hours editing.",
  meet: "Meet your AI video copilot.",
  weak: "Find the weak spots.",
  count: "Make every second count.",
  end1: "Stop guessing.",
  end2: "Start creating better videos.",
  cta: "Try Publishub",
  ctaNote: "Free analysis · No account required", // Landing.hero.ctaNote
  url: "getpublishub.com",
};

/* O Reel de receita do exemplo: quatro clipes, 19 segundos. A abertura lenta
   (a alface) é onde as pessoas saem. */
export interface Clip {
  id: string;
  src: string;
  dur: number; // segundos no Reel
  thumbs: string[];
}

export const CLIPS: Clip[] = [
  { id: "lettuce", src: "footage/a-lettuce.mp4", dur: 4, thumbs: [0, 1, 2].map((k) => `footage/thumb-a-lettuce-${k}.jpg`) },
  { id: "flame", src: "footage/b-flame.mp4", dur: 6, thumbs: [0, 1, 2].map((k) => `footage/thumb-b-flame-${k}.jpg`) },
  { id: "parm", src: "footage/c-parm.mp4", dur: 5, thumbs: [0, 1, 2].map((k) => `footage/thumb-c-parm-${k}.jpg`) },
  { id: "plate", src: "footage/d-plate.mp4", dur: 4, thumbs: [0, 1, 2].map((k) => `footage/thumb-d-plate-${k}.jpg`) },
];
export const REEL_SEC = CLIPS.reduce((a, c) => a + c.dur, 0);
export const DROP_SEC = 3;

/* As sugestões, nas frentes que o produto revisa (Landing.plan.items): gancho,
   legenda e ritmo. São do exemplo, como tudo que a tela mostra. */
export const UI = {
  example: "Example",
  file: "weeknight-pasta.mp4",
  dropAt: "Drop at 0:03",
  plan: "Editing plan",
  accept: "Accept",
  accepted: "Accepted",
  caption: "Weeknight meatball pasta",
  items: [
    { time: "0:00 → 0:04", kind: "Hook", text: "Slow open: people leave before the sizzle. Start on the flame." },
    { time: "0:00", kind: "Caption", text: "Put the dish name on screen in the first second." },
    { time: "0:12", kind: "Pacing", text: "Trim the pause before the cheese." },
  ],
};

/* A curva do exemplo: a mesma função de frontend/src/lib/fixtures.ts. */
export type Point = [number, number];
function buildCurve(durationSec: number, dropAtSec: number, dropTo: number, endAt: number): Point[] {
  const points: Point[] = [];
  const preDropEnd = 100 - dropAtSec * 1.8;
  for (let t = 0; t <= durationSec; t++) {
    let retained: number;
    if (t <= dropAtSec) retained = 100 - (100 - preDropEnd) * (t / Math.max(dropAtSec, 1));
    else if (t <= dropAtSec + 2) {
      const k = (t - dropAtSec) / 2;
      retained = preDropEnd - (preDropEnd - dropTo) * (1 - Math.pow(1 - k, 2));
    } else {
      const k = (t - dropAtSec - 2) / Math.max(durationSec - dropAtSec - 2, 1);
      retained = dropTo - (dropTo - endAt) * k;
    }
    const wobble = Math.sin(t * 1.7) * 0.6 + Math.cos(t * 0.9) * 0.4;
    points.push([t, Math.round((retained + wobble) * 10) / 10]);
  }
  return points;
}
export const CURVE = buildCurve(REEL_SEC, DROP_SEC, 58, 41);
