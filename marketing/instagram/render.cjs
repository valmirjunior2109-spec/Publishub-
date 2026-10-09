/**
 * Criativos do Instagram da Publishub, em inglês, exportados em PNG 1080×1350 (4:5, feed).
 *
 *   node marketing/instagram/render.cjs   → images/en/*.png
 *
 * Cada post tem uma linguagem visual própria; o que liga todos é a marca: a caneta
 * azul, o caramelo do caderno, o papel creme, a tinta e a Geist. Nada de número
 * inventado: as curvas são de exemplo e as falas são as da demo da landing.
 * Usa o Playwright do ambiente (npm root -g) e fontes do Google Fonts.
 */
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));

const W = 1080;
const H = 1350;
const C = { blue: "#1f47a6", pen: "#8faaf0", cream: "#f6f0e4", paper: "#fffdf8", ink: "#1e1b18", night: "#141210", muted: "#5c544b", line: "#e4d6c1", caramel: "#c9824a", sticky: "#f3d9a4" };

/* ---------- traço de mão: tudo determinístico, para o PNG sair igual a cada render ---------- */
function rng(seed) {
  // mulberry32: sementes vizinhas dão sequências sem relação entre si
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
/** Um círculo de caneta, que não fecha certinho. */
function handCircle(w, h, color, seed = 3, sw = 7) {
  const r = rng(seed);
  const cx = w / 2, cy = h / 2;
  const pts = [];
  for (let a = -0.5; a <= Math.PI * 2 + 0.6; a += 0.22) {
    const k = 1 + (r() - 0.5) * 0.06;
    pts.push([cx + Math.cos(a) * (w / 2 - 12) * k, cy + Math.sin(a) * (h / 2 - 12) * k]);
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute; overflow:visible"><path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
/** Uma seta de caneta, curva, de (x1,y1) até (x2,y2), em coordenadas do próprio SVG. */
function handArrow(w, h, [x1, y1], [x2, y2], bend, color, sw = 6) {
  const mx = (x1 + x2) / 2 + bend[0], my = (y1 + y2) / 2 + bend[1];
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = (da) => `M${x2} ${y2} L${(x2 - 28 * Math.cos(ang + da)).toFixed(1)} ${(y2 - 28 * Math.sin(ang + da)).toFixed(1)}`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute; overflow:visible"><path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2} ${head(0.5)} ${head(-0.5)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
/** O ✓ desenhado. */
const handCheck = (color, size = 46) => `<svg width="${size}" height="${size}" viewBox="0 0 46 46" style="flex-shrink:0"><path d="M6 25 L18 37 L41 8" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// o caderno do logo (o mesmo de src/components/Logo.tsx)
const mark = (pen, h = 40) => `
<svg viewBox="0 0 104 120" height="${h}" width="${(h * 104) / 120}" aria-hidden="true">
  <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A"/><rect x="14" y="93" width="54" height="9" rx="4.5" fill="#FBF3E6"/>
  <rect x="54" y="8" width="8" height="104" fill="#1E1B18"/>
  <g transform="rotate(20 75 58)" fill="${pen}"><rect x="70" y="8" width="10" height="80" rx="5"/><rect x="78" y="12" width="5" height="4" rx="1"/>
    <rect x="81" y="12" width="3.4" height="26" rx="1.7"/><path d="M70.5 86 L79.5 86 L75 99 Z"/>
    <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="#FBF3E6"/><circle cx="75" cy="99.5" r="1.3" fill="#1E1B18"/></g>
</svg>`;
const brand = (color, pen, right = "") =>
  `<div style="display:flex; align-items:center; justify-content:space-between; color:${color}">
     <span style="display:flex; align-items:center; gap:14px; font-weight:700; font-size:30px; letter-spacing:-0.03em">${mark(pen)}Publishub</span>
     <span class="mono" style="font-size:24px; opacity:.7">${right}</span></div>`;

const CSS = `
* { box-sizing:border-box; margin:0; padding:0; }
body { width:${W}px; height:${H}px; overflow:hidden; }
.slide { width:${W}px; height:${H}px; position:relative; overflow:hidden; font-family:"Geist",system-ui,sans-serif; -webkit-font-smoothing:antialiased; display:flex; flex-direction:column; }
.mono { font-family:"Geist Mono",ui-monospace,monospace; }
.hand { font-family:"Caveat",cursive; font-weight:700; }
.tight { letter-spacing:-0.05em; line-height:0.95; font-weight:750; }
.ruled { background-color:${C.paper};
  background-image: linear-gradient(90deg, transparent 118px, rgba(201,130,74,.55) 118px, rgba(201,130,74,.55) 121px, transparent 121px),
                    repeating-linear-gradient(180deg, transparent 0 63px, rgba(31,71,166,.13) 63px 65px); }
.marker { background:linear-gradient(transparent 44%, rgba(31,71,166,.88) 44%, rgba(31,71,166,.88) 58%, transparent 58%); -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.tape { position:absolute; width:180px; height:46px; background:rgba(255,253,248,.55); border:1px solid rgba(30,27,24,.06); }
`;

/* ================================================================ 01 · carrossel: a caneta de revisão */

const MISTAKES = [
  {
    title: "Opening with “Hey guys”.",
    said: "Hey guys, how's it going? Today I want to tell you something.",
    note: "hook takes way too long",
    fix: "Open with the result: <br>“30 days without coffee. This changed.”",
  },
  {
    title: "Context before the promise.",
    said: "So, before anything else, let me give you some quick context.",
    note: "why would they stay?",
    fix: "Say what they get by staying. First. Context later, if at all.",
  },
  {
    title: "Captions that show up late.",
    timing: true,
    note: "2 seconds with nothing to read",
    fix: "Put the number on screen the same second you say it.",
  },
  {
    title: "Saying the same thing twice.",
    said: "So, uh, like, my sleep, my sleep really changed.",
    note: "you already said this at 0:14",
    fix: "If you said it, move on.",
  },
  {
    title: "The long goodbye.",
    said: "So that's it, guys, bye, see you in the next one.",
    note: "people leave before the end",
    fix: "End on the high point, with one ask: “Save this to try tomorrow.”",
  },
];

function cover() {
  return {
    name: "01-carousel-mistakes-01",
    style: `background:${C.blue}; color:${C.cream}; padding:84px 84px 72px`,
    html: `
      <p class="mono" style="font-size:26px; letter-spacing:.1em; text-transform:uppercase; color:${C.pen}">Reels editing · 5 mistakes</p>
      <h1 class="tight" style="margin-top:36px; font-size:96px">Your Reel didn't flop.</h1>
      <h1 class="tight" style="font-size:96px; color:${C.pen}">It lost people here:</h1>
      <div style="position:relative; margin:auto 0 0 -10px; height:420px">
        <p class="tight" style="font-size:370px; letter-spacing:-0.07em; line-height:1; position:absolute; left:40px; top:8px">0:04</p>
        <div style="position:absolute; left:0; top:-6px">${handCircle(900, 430, C.sticky, 11, 9)}</div>
      </div>
      <div style="position:relative; height:150px">
        <div style="position:absolute; left:120px; top:-40px">${handArrow(200, 130, [140, 118], [30, 10], [-40, 20], C.sticky)}</div>
        <p class="hand" style="position:absolute; left:250px; top:84px; font-size:58px; color:${C.sticky}; transform:rotate(-4deg); white-space:nowrap">attention drops right here</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:2px solid rgba(246,240,228,.25); padding-top:30px">
        <span style="display:flex; align-items:center; gap:14px; font-weight:700; font-size:30px; letter-spacing:-0.03em">${mark(C.pen)}Publishub</span>
        <span class="mono" style="font-size:28px">swipe →</span>
      </div>`,
  };
}

function mistake(m, i) {
  const left = i % 2 === 0;
  const rot = left ? -2.2 : 1.8;
  const said = m.timing
    ? `<div style="position:relative; margin-top:6px">
        <p class="mono" style="font-size:24px; color:${C.muted}">SPEECH · 0:12 “I slept 2 hours more”</p>
        <div style="margin-top:14px; display:flex; align-items:center; gap:5px; height:110px">
          ${Array.from({ length: 52 }, (_, k) => { const r = rng(k + 7)(); const on = k >= 8 && k <= 30; return `<span style="flex:1; height:${Math.round(14 + r * (on ? 92 : 24))}px; background:${on ? C.ink : "rgba(30,27,24,.22)"}; border-radius:3px"></span>`; }).join("")}
        </div>
        <p class="mono" style="margin-top:30px; font-size:24px; color:${C.blue}">TEXT ON SCREEN · 0:14</p>
        <div style="position:relative; margin-top:14px; height:66px">
          <div style="position:absolute; left:${(8 / 52) * 100}%; width:${(22 / 52) * 100}%; top:0; bottom:0; border:4px dashed ${C.blue}; border-radius:12px; background:rgba(31,71,166,.06)"></div>
          <div style="position:absolute; left:${(30 / 52) * 100}%; top:0; height:66px; display:flex; align-items:center; background:${C.ink}; color:${C.cream}; font-weight:700; font-size:30px; padding:0 22px; border-radius:12px; white-space:nowrap">+2 HOURS OF SLEEP</div>
        </div>
      </div>`
    : `<p style="font-size:60px; line-height:1.28; font-weight:600; letter-spacing:-0.025em; color:${C.ink}"><span class="marker">${m.said}</span></p>`;
  return {
    name: `01-carousel-mistakes-0${i + 2}`,
    style: `color:${C.ink}; padding:84px 84px 72px 160px`,
    cls: "ruled",
    html: `
      <p class="tight" style="position:absolute; ${left ? "right:56px" : "right:56px"}; top:40px; font-size:210px; color:transparent; -webkit-text-stroke:4px ${C.caramel}; letter-spacing:-0.06em">0${i + 1}</p>
      <p class="mono" style="font-size:24px; letter-spacing:.1em; text-transform:uppercase; color:${C.caramel}">Mistake ${i + 1} of 5</p>
      <h2 class="tight" style="margin-top:22px; font-size:76px; max-width:530px">${m.title}</h2>
      <div style="margin-top:60px; position:relative">${said}
        <p class="hand" style="margin-top:22px; font-size:56px; color:${C.blue}; transform:rotate(${left ? -3 : 2}deg); transform-origin:left">↳ ${m.note}</p>
      </div>
      <div style="margin-top:auto; margin-bottom:52px; position:relative; align-self:${left ? "flex-end" : "flex-start"}; width:760px; transform:rotate(${rot}deg); background:${C.sticky}; padding:52px 48px 46px; box-shadow:0 22px 40px -18px rgba(30,27,24,.45)">
        <span class="tape" style="left:290px; top:-22px; transform:rotate(${-rot * 2}deg)"></span>
        <p class="mono" style="font-size:24px; letter-spacing:.1em; text-transform:uppercase; color:${C.caramel}; font-weight:500">Try instead</p>
        <p style="margin-top:14px; font-size:48px; line-height:1.18; font-weight:700; letter-spacing:-0.03em">${m.fix}</p>
      </div>
      ${brand(C.ink, C.blue, `${i + 2}/7`)}`,
  };
}

function ending() {
  const checks = ["Opens with the result", "Promise before context", "Captions land with the words", "Nothing said twice", "Ends on the high point"];
  return {
    name: "01-carousel-mistakes-07",
    style: `background:${C.ink}; color:${C.cream}; padding:84px 84px 72px`,
    html: `
      <p class="hand" style="font-size:64px; color:${C.pen}; transform:rotate(-3deg); transform-origin:left">before you post…</p>
      <h2 class="tight" style="margin-top:18px; font-size:92px">Run your Reel through these 5.</h2>
      <ul style="list-style:none; margin-top:56px; display:flex; flex-direction:column; gap:22px">
        ${checks.map((x) => `<li style="display:flex; align-items:center; gap:26px; font-size:44px; font-weight:600; letter-spacing:-0.02em; border-bottom:2px dashed rgba(246,240,228,.18); padding-bottom:20px">${handCheck(C.pen)}${x}</li>`).join("")}
      </ul>
      <div style="margin-top:auto; margin-bottom:48px; display:flex; gap:28px; align-items:center">
        <div style="flex:1; background:${C.blue}; border-radius:28px; padding:34px 38px">
          <p style="font-size:34px; line-height:1.3; font-weight:500">Not sure where <b>your</b> video loses people? Publishub points to the second and suggests what to change.</p>
          <p class="mono" style="margin-top:16px; font-size:26px; color:${C.sticky}">free to start · link in bio</p>
        </div>
      </div>
      ${brand(C.cream, C.pen, "save this ↓")}`,
  };
}

/* ================================================================ 02 · o cupom fiscal */

function receipt() {
  const items = [
    ["HOOK", "0–3s", "say or show the payoff"],
    ["CUTS", "every", "does each part earn its time?"],
    ["PACING", "pauses", "trim the dead air"],
    ["B-ROLL", "static?", "never a still screen while you talk"],
    ["CAPTIONS", "sync", "text lands with the words"],
    ["STRUCTURE", "order", "best moment early enough"],
    ["CTA", "x1", "one ask, in the right place"],
  ];
  // borda serrilhada do papel
  const zig = (n, y0, dir) => Array.from({ length: n + 1 }, (_, k) => `${(k / n) * 100}% ${k % 2 ? y0 + dir * 14 : y0}px`);
  const top = zig(40, 14, -1).join(",");
  const bars = Array.from({ length: 64 }, (_, k) => { const r = rng(k * 13 + 5)(); return `<span style="width:${r > 0.6 ? 6 : r > 0.3 ? 3 : 2}px; background:${C.ink}; height:100%"></span>`; }).join("");
  return {
    name: "02-checklist-receipt",
    style: `background:${C.blue}; color:${C.ink}; align-items:center; padding:52px 0 56px`,
    html: `
      <p class="hand" style="font-size:62px; color:${C.sticky}; transform:rotate(-3deg)">save this before your next Reel ↓</p>
      <div style="margin-top:26px; width:780px; background:${C.paper}; transform:rotate(-1.4deg); padding:50px 58px 40px; box-shadow:0 40px 60px -30px rgba(0,0,0,.55);
        clip-path:polygon(${top}, 100% calc(100% - 14px), ${zig(40, 0, 1).map((p) => p.replace(/ (\d+)px$/, (_, y) => ` calc(100% - ${14 - Number(y)}px)`)).reverse().join(",")}, 0 calc(100% - 14px))">
        <div class="mono" style="text-align:center">
          <p style="font-size:44px; font-weight:700; letter-spacing:.08em">PUBLISHUB</p>
          <p style="font-size:22px; margin-top:6px; color:${C.muted}">EDIT RECEIPT · BEFORE YOU POST</p>
        </div>
        <p class="mono" style="margin:22px 0; font-size:22px; color:${C.muted}; overflow:hidden; white-space:nowrap">- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</p>
        ${items
          .map(
            ([a, b, d]) => `<div class="mono" style="margin-bottom:9px">
              <p style="display:flex; align-items:baseline; gap:12px; font-size:30px; font-weight:700"><span>[ ]</span><span>${a}</span><span style="flex:1; border-bottom:3px dotted ${C.muted}; transform:translateY(-6px)"></span><span style="font-weight:500">${b}</span></p>
              <p style="font-size:22px; color:${C.muted}; padding-left:62px; margin-top:2px">${d}</p></div>`,
          )
          .join("")}
        <p class="mono" style="margin:8px 0 16px; font-size:22px; color:${C.muted}; overflow:hidden; white-space:nowrap">- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</p>
        <p class="mono" style="display:flex; justify-content:space-between; font-size:34px; font-weight:700"><span>TOTAL</span><span>READY TO POST</span></p>
        <div style="margin:20px auto 0; height:58px; width:560px; display:flex; justify-content:space-between">${bars}</div>
        <p class="mono" style="text-align:center; margin-top:12px; font-size:20px; color:${C.muted}">KEEP THIS RECEIPT · getpublishub.com</p>
      </div>
      <div style="margin-top:auto; width:100%; padding:0 84px">${brand(C.cream, C.pen, "7-point edit check")}</div>`,
  };
}

/* ================================================================ 03 · o meme do penhasco */

function cliff() {
  const stick = (x, y, rot, s = 1, color = C.ink) => `
    <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke="${color}" stroke-width="5" stroke-linecap="round" fill="none">
      <circle cx="0" cy="-58" r="12" fill="${color}"/><path d="M0 -46 L0 -14 M0 -36 L-15 -22 M0 -36 L15 -24 M0 -14 L-12 8 M0 -14 L12 8"/></g>`;
  const fall = (x, y, rot) => `
    <g transform="translate(${x} ${y}) rotate(${rot})" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" fill="none">
      <circle cx="0" cy="-58" r="12" fill="${C.ink}"/><path d="M0 -46 L0 -14 M0 -36 L-20 -52 M0 -36 L20 -54 M0 -14 L-16 4 M0 -14 L14 6"/></g>`;
  // planalto até 0:04, penhasco, e o resto da curva lá embaixo
  const ground = `M0 120 L360 120 L380 132 L400 470 L520 500 L1080 540 L1080 700 L0 700 Z`;
  return {
    name: "03-meme-cliff",
    style: `background:${C.cream}; color:${C.ink}`,
    html: `
      <div style="padding:84px 84px 0">
        <p style="font-size:46px; font-weight:600; letter-spacing:-0.02em">me after rewatching my own Reel 10 times:</p>
        <p class="hand" style="margin-top:10px; font-size:132px; line-height:1; color:${C.blue}; transform:rotate(-2deg); transform-origin:left">“it's perfect. no notes.”</p>
        <p style="margin-top:58px; font-size:46px; font-weight:600; letter-spacing:-0.02em">my audience at 0:04:</p>
      </div>
      <div style="position:relative; margin-top:auto; height:700px">
        <svg width="1080" height="700" viewBox="0 0 1080 700" style="position:absolute; inset:0">
          <path d="${ground}" fill="${C.ink}"/>
          <path d="M0 120 L360 120 L380 132 L400 470 L520 500 L1080 540" fill="none" stroke="${C.blue}" stroke-width="8" stroke-linejoin="round"/>
          ${stick(110, 120, 0)}${stick(200, 120, 0)}${stick(290, 120, 0)}${stick(350, 120, 8)}
          ${fall(470, 210, 35)}${fall(560, 330, -40)}${fall(450, 400, 120)}
          <line x1="380" y1="20" x2="380" y2="132" stroke="${C.blue}" stroke-width="4" stroke-dasharray="8 10"/>
          <text x="398" y="40" font-family="Geist Mono" font-size="30" fill="${C.blue}">0:04</text>
          <text x="620" y="470" font-family="Caveat" font-weight="700" font-size="56" fill="${C.ink}">aaaaaa</text>
        </svg>
        <div style="position:absolute; left:84px; right:84px; bottom:60px">${brand(C.cream, C.pen, "example curve")}</div>
      </div>`,
  };
}

/* ================================================================ 04 · a timeline do editor */

function timeline() {
  const T = 34, X0 = 40, X1 = 872;
  const x = (s) => X0 + (s / T) * (X1 - X0);
  const cuts = [
    [0, 6, "slow hook"],
    [19, 21, "repeat"],
    [32, 34, "goodbye"],
  ];
  const clips = [[0, 3], [3, 6], [6, 9], [9, 14], [14, 19], [19, 21], [21, 24], [24, 30], [30, 34]];
  const wave = Array.from({ length: 120 }, (_, k) => { const r = rng(k * 7 + 3)(); const s = (k / 120) * T; const h = 8 + r * 46 * (s > 6 && s < 30 ? 1 : 0.6); return `<rect x="${(x(s) - 2).toFixed(1)}" y="${(256 - h / 2).toFixed(1)}" width="4" height="${h.toFixed(1)}" rx="2" fill="${C.cream}" fill-opacity=".55"/>`; }).join("");
  const hatch = cuts.map(([a, b, label]) => `
    <rect x="${x(a)}" y="70" width="${x(b) - x(a)}" height="300" fill="url(#hatch)"/>
    <rect x="${x(a)}" y="70" width="${x(b) - x(a)}" height="300" fill="none" stroke="${C.pen}" stroke-width="3"/>
    <text x="${b === T ? x(b) : x(a) + 8}" y="398" text-anchor="${b === T ? "end" : "start"}" font-family="Geist Mono" font-size="22" fill="${C.pen}">✂ ${label}</text>`).join("");
  return {
    name: "04-cut-this-timeline",
    style: `background:${C.night}; color:${C.cream}; padding:84px 84px 72px`,
    html: `
      <p class="mono" style="font-size:26px; letter-spacing:.1em; text-transform:uppercase; color:${C.pen}">Edit · 10 seconds you don't need</p>
      <h2 class="tight" style="margin-top:28px; font-size:92px">Same video.<br>10 seconds shorter.</h2>
      <div style="margin-top:56px; background:#1d1a17; border:2px solid #2e2924; border-radius:28px; padding:28px 0 24px">
        <svg width="912" height="420" viewBox="0 0 912 420">
          <defs><pattern id="hatch" width="16" height="16" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="16" fill="${C.pen}" fill-opacity=".38"/></pattern></defs>
          ${[0, 6, 12, 18, 24, 30, 34].map((s) => `<line x1="${x(s)}" y1="22" x2="${x(s)}" y2="40" stroke="${C.cream}" stroke-opacity=".4" stroke-width="2"/><text x="${x(s) - 22}" y="16" font-family="Geist Mono" font-size="20" fill="${C.cream}" fill-opacity=".55">0:${String(s).padStart(2, "0")}</text>`).join("")}
          <text x="0" y="122" font-family="Geist Mono" font-size="20" fill="${C.cream}" fill-opacity=".5">V1</text>
          ${clips.map(([a, b], k) => `<rect x="${x(a) + 2}" y="84" width="${x(b) - x(a) - 4}" height="88" rx="10" fill="${k % 2 ? C.caramel : "#a8683a"}"/>`).join("")}
          <text x="0" y="262" font-family="Geist Mono" font-size="20" fill="${C.cream}" fill-opacity=".5">A1</text>
          ${wave}
          <text x="0" y="350" font-family="Geist Mono" font-size="20" fill="${C.cream}" fill-opacity=".5">T1</text>
          ${[[6, 9], [9, 14], [14, 19], [21, 24], [24, 30]].map(([a, b]) => `<rect x="${x(a) + 2}" y="322" width="${x(b) - x(a) - 4}" height="40" rx="8" fill="${C.cream}" fill-opacity=".85"/>`).join("")}
          ${hatch}
          <line x1="${x(6)}" y1="44" x2="${x(6)}" y2="372" stroke="${C.sticky}" stroke-width="4"/><path d="M${x(6) - 12} 40 L${x(6) + 12} 40 L${x(6)} 56 Z" fill="${C.sticky}"/>
        </svg>
      </div>
      <p class="hand" style="margin-top:22px; margin-left:${x(6) - 10}px; font-size:52px; color:${C.sticky}; transform:rotate(-2deg)">↑ the payoff is your new first second</p>
      <div style="margin-top:auto; margin-bottom:44px; display:flex; align-items:flex-end; gap:36px">
        <div><p class="mono" style="font-size:24px; opacity:.6">before</p><p class="tight" style="font-size:120px; opacity:.45; text-decoration:line-through; text-decoration-thickness:6px">0:34</p></div>
        <p class="tight" style="font-size:90px; color:${C.pen}; padding-bottom:10px">→</p>
        <div><p class="mono" style="font-size:24px; color:${C.pen}">after</p><p class="tight" style="font-size:120px">0:24</p></div>
      </div>
      ${brand(C.cream, C.pen, "example edit")}`,
  };
}

/* ================================================================ 05 · o gancho, do lado do público */

function chat() {
  const you = (t) => `<div style="align-self:flex-end; max-width:76%; background:${C.blue}; color:${C.paper}; font-size:28px; line-height:1.28; padding:16px 22px; border-radius:28px 28px 8px 28px">${t}</div>`;
  const them = (t, extra = "") => `<div style="align-self:flex-start; max-width:76%; background:#ebe2d2; color:${C.ink}; font-size:28px; line-height:1.28; padding:16px 22px; border-radius:28px 28px 28px 8px; ${extra}">${t}</div>`;
  const tag = (t) => `<p class="mono" style="align-self:center; font-size:20px; color:${C.muted}; letter-spacing:.08em; text-transform:uppercase; margin:6px 0">${t}</p>`;
  return {
    name: "05-hook-chat",
    style: `background:${C.caramel}; color:${C.paper}; align-items:center; padding:72px 0 64px`,
    html: `
      <h2 class="tight" style="font-size:74px; text-align:center; max-width:880px">Your hook, from your audience's side.</h2>
      <div style="margin-top:44px; width:640px; height:930px; background:${C.ink}; border-radius:84px; padding:18px; box-shadow:0 40px 70px -30px rgba(0,0,0,.5)">
        <div style="width:100%; height:100%; background:${C.paper}; border-radius:68px; overflow:hidden; display:flex; flex-direction:column">
          <div style="display:flex; align-items:center; gap:18px; padding:40px 34px 18px; border-bottom:2px solid ${C.line}">
            <span style="width:62px; height:62px; border-radius:50%; background:${C.ink}; display:grid; place-items:center; color:${C.cream}; font-weight:700; font-size:28px">A</span>
            <span><p style="color:${C.ink}; font-weight:700; font-size:30px; letter-spacing:-0.02em">your audience</p><p class="mono" style="color:${C.muted}; font-size:20px">thumb on the screen</p></span>
          </div>
          <div style="flex:1; display:flex; flex-direction:column; gap:12px; padding:20px 24px">
            ${tag("your old opening")}
            ${you("Hey guys, how's it going? Today I want to talk about something…")}
            ${them("<i>*keeps scrolling*</i>", `color:${C.muted}`)}
            ${tag("your new opening")}
            ${you("I quit coffee for 30 days. Here's what happened.")}
            ${them("wait")}
            ${them("what happened??")}
            ${them("<i>*watches till the end*</i>", `color:${C.muted}`)}
          </div>
        </div>
      </div>
      <div style="margin-top:auto; width:100%; padding:0 84px">${brand(C.paper, C.blue, "same video · new first line")}</div>`,
  };
}

/* ---------------------------------------------------------------- render */

function page(s) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Geist:wght@400;500;600;700;750;800&family=Geist+Mono:wght@400;500;700&display=block" rel="stylesheet">
<style>${CSS}</style></head><body><div class="slide ${s.cls || ""}" style="${s.style}">${s.html}</div></body></html>`;
}

(async () => {
  const slides = [cover(), ...MISTAKES.map(mistake), ending(), receipt(), cliff(), timeline(), chat()];
  const dir = path.join(__dirname, "images", "en");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page_ = await browser.newPage({ viewport: { width: W, height: H } });
  for (const s of slides) {
    await page_.setContent(page(s), { waitUntil: "networkidle" });
    await page_.evaluate(() => document.fonts.ready);
    // nada pode vazar da arte: o conteúdo em fluxo tem que caber nos 1350 px
    const over = await page_.evaluate(() => { const el = document.querySelector(".slide"); return el.scrollHeight - el.clientHeight; });
    if (over > 0) console.warn(`! ${s.name}: ${over}px a mais`);
    await page_.screenshot({ path: path.join(dir, `${s.name}.png`) });
  }
  await browser.close();
  console.log(`${slides.length} imagens em ${path.relative(process.cwd(), dir)}`);
})();
