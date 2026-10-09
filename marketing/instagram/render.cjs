/**
 * Criativos do Instagram da Publishub: HTML com a identidade do site (Geist,
 * papel creme, tinta e a caneta azul) exportado em PNG 1080×1350 (4:5, feed).
 *
 *   node marketing/instagram/render.cjs        → images/en/*.png (o Instagram é em inglês)
 *   node marketing/instagram/render.cjs pt     → images/pt/*.png
 *
 * Usa o Playwright que já vem no ambiente (npm root -g) e as fontes do Google Fonts.
 */
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
const COPY = require("./content.cjs");

const W = 1080;
const H = 1350;

// o caderno do logo (o mesmo de src/components/Logo.tsx)
const mark = (pen) => `
<svg viewBox="0 0 104 120" width="34" height="39" aria-hidden="true">
  <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A"/>
  <rect x="14" y="93" width="54" height="9" rx="4.5" fill="#FBF3E6"/>
  <rect x="54" y="8" width="8" height="104" fill="#1E1B18"/>
  <g transform="rotate(20 75 58)" fill="${pen}">
    <rect x="70" y="8" width="10" height="80" rx="5"/><rect x="78" y="12" width="5" height="4" rx="1"/>
    <rect x="81" y="12" width="3.4" height="26" rx="1.7"/><path d="M70.5 86 L79.5 86 L75 99 Z"/>
    <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="#FBF3E6"/><circle cx="75" cy="99.5" r="1.3" fill="#1E1B18"/>
  </g>
</svg>`;

const CSS = `
:root { --paper:#f6f0e4; --raised:#fffdf8; --surface:#efe6d6; --ink:#1e1b18; --muted:#5c544b; --line:#e4d6c1; --accent:#1f47a6; --soft:#e3e9f7; --ok:#2f7a3c; --pen:#1f47a6; }
.dark { --paper:#17140f; --raised:#201c17; --surface:#26211b; --ink:#f4ecdf; --muted:#b3a797; --line:#3a322a; --accent:#8faaf0; --soft:#1e2840; --ok:#7fc48a; --pen:#8faaf0; }
* { box-sizing:border-box; margin:0; }
body { width:${W}px; height:${H}px; overflow:hidden; }
.slide { width:${W}px; height:${H}px; padding:84px 84px 72px; display:flex; flex-direction:column; background:var(--paper); color:var(--ink);
  font-family:"Geist",system-ui,sans-serif; -webkit-font-smoothing:antialiased; position:relative; }
.mono { font-family:"Geist Mono",ui-monospace,monospace; }
.kicker { font-family:"Geist Mono",monospace; font-size:26px; letter-spacing:0.08em; text-transform:uppercase; color:var(--accent); display:flex; align-items:center; gap:16px; }
.kicker .n { color:var(--muted); }
.title { font-weight:650; letter-spacing:-0.045em; line-height:1.02; text-wrap:balance; }
.t-xl { font-size:104px; } .t-l { font-size:84px; } .t-m { font-size:68px; }
.lead { font-size:36px; line-height:1.35; color:var(--muted); }
.foot { margin-top:auto; display:flex; align-items:center; justify-content:space-between; padding-top:36px; border-top:2px solid var(--line); }
.brand { display:flex; align-items:center; gap:14px; font-weight:650; font-size:30px; letter-spacing:-0.03em; }
.foot .meta { font-family:"Geist Mono",monospace; font-size:24px; color:var(--muted); }
.tag { display:inline-block; font-family:"Geist Mono",monospace; font-size:22px; color:var(--muted); border:2px solid var(--line); border-radius:999px; padding:6px 16px; }
.card { background:var(--raised); border:2px solid var(--line); border-radius:28px; }
.line { display:grid; grid-template-columns:96px 1fr; column-gap:24px; padding:26px 0; border-bottom:2px solid var(--line); }
.line:last-child { border-bottom:0; }
.line .time { font-family:"Geist Mono",monospace; font-size:28px; color:var(--muted); padding-top:6px; }
.line .text { font-size:44px; line-height:1.3; letter-spacing:-0.01em; }
.line .note { grid-column:2; margin-top:12px; font-size:30px; color:var(--accent); }
.line.row-keep .note { color:var(--ok); }
.cut { text-decoration:line-through; text-decoration-color:var(--accent); text-decoration-thickness:4px; color:var(--muted); }
.keepmark { background:var(--soft); border-radius:6px; box-shadow:0 0 0 6px var(--soft); -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.fix { border:2px solid var(--accent); background:var(--soft); border-radius:28px; padding:40px 44px; }
.fix .label { font-family:"Geist Mono",monospace; font-size:24px; letter-spacing:0.08em; text-transform:uppercase; color:var(--accent); }
.fix .body { margin-top:18px; font-size:50px; line-height:1.25; font-weight:600; letter-spacing:-0.025em; }
.check { width:44px; height:44px; border:3px solid var(--ink); border-radius:10px; flex-shrink:0; display:grid; place-items:center; }
.check.on { background:var(--accent); border-color:var(--accent); }
.check.on::after { content:""; width:20px; height:11px; border-left:4px solid var(--paper); border-bottom:4px solid var(--paper); transform:rotate(-45deg) translate(2px,-2px); }
`;

function foot(c, right, dark) {
  return `<div class="foot"><span class="brand">${mark(dark ? "#8faaf0" : "#1f47a6")}Publishub</span><span class="meta">${right}</span></div>`;
}

/* a curva de retenção de exemplo: cai no segundo 4 */
function curve({ dropLabel, tag, dark, height = 360 }) {
  const ink = dark ? "#f4ecdf" : "#1e1b18";
  const accent = dark ? "#8faaf0" : "#1f47a6";
  const pts = [[0, 92], [6, 88], [10, 86], [12, 84], [14, 60], [17, 52], [22, 50], [35, 47], [50, 44], [65, 41], [80, 38], [100, 35]];
  const x = (v) => 40 + (v / 100) * 830;
  const y = (v) => 20 + (1 - v / 100) * (height - 70);
  const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${x(a).toFixed(1)} ${y(b).toFixed(1)}`).join(" ");
  const area = `${d} L${x(100)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const dx = x(12), dy = y(84);
  return `
  <div style="position:relative">
    <svg viewBox="0 0 912 ${height}" width="100%" height="${height}">
      <path d="${area}" fill="${ink}" fill-opacity="0.06"/>
      <path d="${d}" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
      <line x1="${dx}" y1="${dy}" x2="${dx}" y2="${y(0)}" stroke="${accent}" stroke-width="3" stroke-dasharray="6 8"/>
      <circle cx="${dx}" cy="${dy}" r="26" fill="${accent}" fill-opacity="0.18"/>
      <circle cx="${dx}" cy="${dy}" r="11" fill="${accent}"/>
      <text x="${x(0)}" y="${y(0) + 40}" font-family="Geist Mono" font-size="24" fill="${ink}" fill-opacity="0.55">0:00</text>
      <text x="${dx - 24}" y="${y(0) + 40}" font-family="Geist Mono" font-size="24" fill="${accent}">0:04</text>
      <text x="${x(100) - 60}" y="${y(0) + 40}" font-family="Geist Mono" font-size="24" fill="${ink}" fill-opacity="0.55">0:34</text>
    </svg>
    <span class="mono" style="position:absolute; left:${dx + 44}px; top:${dy - 34}px; font-size:30px; color:${accent}">${dropLabel}</span>
    <span class="tag" style="position:absolute; right:0; top:0">${tag}</span>
  </div>`;
}

function lines(list) {
  return list
    .map(
      (l) => `<div class="line ${l.mark ? "row-" + l.mark : ""}"><span class="time">${l.time}</span><span class="text"><span class="${l.mark === "cut" ? "cut" : l.mark === "keep" ? "keepmark" : ""}">${l.text}</span></span>${l.note ? `<span class="note">${l.note}</span>` : ""}</div>`,
    )
    .join("");
}

/* ---------- os criativos ---------- */

function carousel(c) {
  const k = c.carousel;
  const total = k.errors.length + 2;
  const slides = [];

  slides.push({
    dark: true,
    html: `
    <p class="kicker">${k.cover.kicker}</p>
    <h1 class="title t-xl" style="margin-top:40px">${k.cover.title}</h1>
    <div style="margin-top:auto">${curve({ dropLabel: k.cover.drop, tag: c.example, dark: true })}</div>
    <p style="margin-top:44px; font-size:40px; font-weight:600; letter-spacing:-0.02em; display:flex; justify-content:space-between; align-items:baseline">
      <span>${k.cover.foot}</span><span class="mono" style="font-size:30px; color:var(--accent); font-weight:400">${c.swipe}</span></p>
    ${foot(c, `1/${total}`, true)}`,
  });

  k.errors.forEach((e, i) => {
    const body = e.timing
      ? `<div class="card" style="padding:40px 44px">
          <div style="display:grid; grid-template-columns:110px 1fr; row-gap:28px; align-items:center; font-size:42px">
            <span class="mono" style="font-size:30px; color:var(--muted)">${e.timing.saidAt}</span><span>${e.timing.said}</span>
            <span class="mono" style="font-size:30px; color:var(--accent)">${e.timing.shownAt}</span><span>${e.timing.shown}</span>
          </div>
          <div style="margin-top:36px; height:28px; border-radius:14px; background:var(--surface); position:relative">
            <div style="position:absolute; left:30%; width:22%; top:0; bottom:0; border-radius:14px; background:var(--accent); opacity:.85"></div>
          </div>
          <p style="margin-top:20px; font-size:32px; color:var(--accent); padding-left:30%">${e.timing.gap}</p>
        </div>`
      : `<div class="card" style="padding:10px 40px">${lines(e.lines)}</div>`;
    slides.push({
      html: `
      <p class="kicker">${k.errorLabel} <span class="n">${String(i + 1).padStart(2, "0")}/0${k.errors.length}</span></p>
      <h2 class="title t-xl" style="margin-top:36px">${e.title}</h2>
      <div style="margin:auto 0; padding:48px 0">
        ${body}
        <div class="fix" style="margin-top:36px"><p class="label">${c.change}</p><p class="body">${e.fix}</p></div>
      </div>
      ${foot(c, `${i + 2}/${total}`)}`,
    });
  });

  slides.push({
    dark: true,
    html: `
    <h2 class="title t-l">${k.end.title}</h2>
    <ul style="list-style:none; padding:0; margin-top:52px; display:flex; flex-direction:column; gap:26px">
      ${k.end.checks.map((x) => `<li style="display:flex; gap:24px; align-items:center; font-size:40px; letter-spacing:-0.015em"><span class="check on"></span>${x}</li>`).join("")}
    </ul>
    <p class="lead" style="margin-top:auto; color:var(--ink); opacity:.8">${k.end.product}</p>
    <p class="mono" style="margin-top:28px; font-size:30px; color:var(--accent)">${k.end.link} · ${c.site}</p>
    ${foot(c, c.save, true)}`,
  });

  return slides.map((s, i) => ({ name: `01-carousel-mistakes-${String(i + 1).padStart(2, "0")}`, ...s }));
}

function checklist(c) {
  const k = c.checklist;
  return [
    {
      name: "02-checklist-before-posting",
      html: `
      <p class="kicker">${k.kicker}</p>
      <h1 class="title t-m" style="margin-top:28px">${k.title}</h1>
      <ul style="list-style:none; padding:0; margin-top:36px">
        ${k.items
          .map(
            ([t, d], i) => `<li style="display:flex; gap:28px; align-items:flex-start; padding:17px 0; border-top:2px solid var(--line)">
              <span class="check" style="margin-top:4px"></span>
              <span style="flex:1"><span style="display:flex; gap:16px; align-items:baseline"><span class="mono" style="font-size:24px; color:var(--muted)">0${i + 1}</span><b style="font-size:38px; letter-spacing:-0.02em; font-weight:650">${t}</b></span>
              <span style="display:block; margin-top:6px; font-size:31px; line-height:1.3; color:var(--muted)">${d}</span></span></li>`,
          )
          .join("")}
      </ul>
      ${foot(c, k.foot)}`,
    },
  ];
}

function meme(c) {
  const k = c.meme;
  return [
    {
      name: "03-meme-tenth-rewatch",
      html: `
      <div style="flex:1; display:flex; flex-direction:column; gap:28px">
        <div class="card" style="flex:1; padding:52px; display:flex; flex-direction:column">
          <p style="font-size:42px; line-height:1.25; letter-spacing:-0.02em">${k.top}</p>
          <p class="title" style="margin:auto 0; font-size:112px">${k.topQuote}</p>
        </div>
        <div class="card dark" style="flex:1; padding:52px; display:flex; flex-direction:column; background:#1e1b18; border-color:#1e1b18; color:#f4ecdf">
          <p style="font-size:42px; line-height:1.25; letter-spacing:-0.02em">${k.bottom}</p>
          <div style="display:flex; align-items:flex-end; gap:24px; margin-top:auto">
            <p class="title" style="font-size:112px; color:#8faaf0; font-style:italic">${k.bottomQuote}</p>
          </div>
          <div style="margin-top:20px">${curve({ dropLabel: "", tag: c.example, dark: true, height: 200 })}</div>
        </div>
      </div>
      <p style="margin-top:32px; font-size:30px; line-height:1.35; color:var(--muted)">${k.caption}</p>
      ${foot(c, c.site)}`,
    },
  ];
}

function cut(c) {
  const k = c.cut;
  return [
    {
      name: "04-cut-this",
      html: `
      <p class="kicker">${k.kicker}</p>
      <h1 class="title" style="margin-top:28px; font-size:58px">${k.title}</h1>
      <div class="card" style="margin-top:40px; padding:4px 36px">
        ${k.lines
          .map(
            (l) => `<div class="line ${l.mark ? "row-" + l.mark : ""}" style="grid-template-columns:76px 1fr; padding:15px 0">
            <span class="time" style="font-size:22px; padding-top:5px">${l.time}</span>
            <span class="text" style="font-size:29px"><span class="${l.mark === "cut" ? "cut" : l.mark === "keep" ? "keepmark" : ""}">${l.text}</span></span>
            ${l.note ? `<span class="note" style="font-size:22px; margin-top:4px">${l.note}</span>` : ""}</div>`,
          )
          .join("")}
      </div>
      <p class="mono" style="margin-top:28px; font-size:26px; color:var(--accent)">${k.final}</p>
      ${foot(c, c.save)}`,
    },
  ];
}

function hooks(c) {
  const k = c.hooks;
  return [
    {
      name: "05-hook-swaps",
      html: `
      <p class="kicker">${k.kicker}</p>
      <h1 class="title t-l" style="margin-top:32px">${k.title}</h1>
      <div style="margin-top:44px; display:flex; flex-direction:column; gap:20px">
        ${k.pairs
          .map(
            ([a, b]) => `<div class="card" style="padding:26px 34px">
              <p style="font-size:30px"><span class="cut">${a}</span></p>
              <p style="margin-top:10px; font-size:36px; font-weight:600; letter-spacing:-0.02em; display:flex; gap:16px"><span style="color:var(--accent)">→</span><span>${b}</span></p>
            </div>`,
          )
          .join("")}
      </div>
      ${foot(c, c.save)}`,
    },
  ];
}

function page(slide) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;650;700&family=Geist+Mono:wght@400;500&display=block" rel="stylesheet">
<style>${CSS}</style></head><body><div class="slide ${slide.dark ? "dark" : ""}">${slide.html}</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page_ = await browser.newPage({ viewport: { width: W, height: H } });
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : ["en"];
  for (const lang of langs) {
    const c = COPY[lang];
    const dir = path.join(__dirname, "images", lang);
    fs.mkdirSync(dir, { recursive: true });
    for (const slide of [...carousel(c), ...checklist(c), ...meme(c), ...cut(c), ...hooks(c)]) {
      await page_.setContent(page(slide), { waitUntil: "networkidle" });
      await page_.evaluate(() => document.fonts.ready);
      // nada pode vazar da arte: se o conteúdo passou de 1350 px, avisa
      const overflow = await page_.evaluate(() => document.querySelector(".slide").scrollHeight - document.querySelector(".slide").clientHeight);
      if (overflow > 0) console.warn(`! ${lang}/${slide.name}: ${overflow}px a mais`);
      await page_.screenshot({ path: path.join(dir, `${slide.name}.png`) });
    }
    console.log(lang, "ok");
  }
  await browser.close();
})();
