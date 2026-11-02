/* ==========================================================================
   Publishub · motion ad: marca, copy e dados do exemplo
   --------------------------------------------------------------------------
   Cores: as de frontend/src/app/globals.css. O anúncio vive no caramelo do
   caderno (a cor da campanha), com a tinta por cima; a interface do produto
   aparece como ela é no site: papel creme, tinta e o azul da caneta.
   ========================================================================== */

export const C = {
  caramel: "#C9824A", // a capa do caderno: o fundo da campanha
  caramelDeep: "#9A5D31", // o caramelo queimado: texto que recua
  night: "#15120E", // a madrugada editando: a cena de abertura
  nightRaised: "#1F1B16",
  nightLine: "#342C24",
  // a interface, no tema claro do site
  paper: "#F6F0E4",
  paperRaised: "#FFFDF8",
  surface: "#EFE6D6",
  ink: "#1E1B18",
  inkMuted: "#5C544B",
  line: "#E4D6C1",
  accent: "#1F47A6",
  accentSoft: "#E3E9F7",
  confirmed: "#2F7A3C",
  cream: "#FBF3E6",
};

export const FONT = {
  sans: "Geist, system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
};

/* A copy do anúncio. A da interface vem de frontend/messages/en.json. */
export const COPY = {
  hook1: "You spend hours editing.",
  hook2a: "But is your video",
  hook2b: "actually working?",
  meet: "Meet your AI video copilot.",
  weak: "Find the weak spots.",
  count: "Make every second count.",
  end1: "Stop guessing.",
  end2: "Start creating better videos.",
  cta: "Try Publishub",
  // a oferta como está no site hoje (Landing.hero.ctaNote)
  ctaNote: "Free analysis · No account required",
  url: "getpublishub.com",
};

/* A tela de análise da landing (Landing.app, Landing.hero, Landing.copilot). */
export const UI = {
  file: "no-coffee-30-days.mp4",
  ready: "Ready",
  example: "Example",
  retention: "Retention",
  dropAt: "Drop at 0:04",
  lost: (n: number) => `−${n}% in 2 seconds`,
  said: "You were saying · 0:03",
  phrase: "So, before anything else, let me give you some quick context on why I decided to do this.",
  plan: "Editing plan",
  suggestions: "4 suggestions",
  accepted: "Accepted",
  accept: "Accept",
  finalEdit: "Final edit: 0:34 → 0:24",
  export: "Export video",
  items: [
    { time: "0:00 → 0:04", kind: "Cut", text: "Drop the intro and open with the result." },
    { time: "0:04", kind: "Hook", text: "Say the number the title promised, right here." },
    { time: "0:12", kind: "Caption", text: "Put the number on screen while you say it." },
  ],
};

/* ---------- a curva do exemplo ----------
   A mesma de frontend/src/lib/fixtures.ts (buildCurve(34, 4, 61, 38)). */
export type Point = [number, number];

function buildCurve(durationSec: number, dropAtSec: number, dropTo: number, endAt: number): Point[] {
  const points: Point[] = [];
  const preDropEnd = 100 - dropAtSec * 1.8;
  for (let t = 0; t <= durationSec; t++) {
    let retained: number;
    if (t <= dropAtSec) {
      retained = 100 - (100 - preDropEnd) * (t / Math.max(dropAtSec, 1));
    } else if (t <= dropAtSec + 2) {
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

export const SAMPLE = {
  durationSec: 34,
  dropAtSec: 4,
  retention: buildCurve(34, 4, 61, 38),
};
// o número que a landing mostra: o que se perdeu nos 2 segundos depois da queda
export const LOST = Math.round(SAMPLE.retention[4][1] - SAMPLE.retention[6][1]);
