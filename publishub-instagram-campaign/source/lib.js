/* Publishub · Instagram campaign — helpers that return HTML strings.
   Logo and pixel icons use the exact art from the site (logo-art.js, components/ui/Pixel.tsx). */

const H = {};

/* ---- the logo: pixel-art "P" (body + </> glyph follow the ink, screen follows the bg) ---- */
H.mark = (size, theme = "dark") => {
  const inPart = (i, [a, b]) => i >= a && i < b;
  const ink = theme === "light" ? "#020002" : "#FFFFFF";
  const scr = theme === "light" ? "#FFFFFF" : "#020002";
  const rects = LOGO_RECTS.map(([x, y, w, h, fill], i) => {
    let f = fill;
    if (inPart(i, LOGO_PARTS.body) || inPart(i, LOGO_PARTS.glyph)) f = ink;
    else if (inPart(i, LOGO_PARTS.screen)) f = scr;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="${LOGO_VIEWBOX}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
};

/* [P]ublishub — same proportions as components/Logo.tsx */
H.wordmark = (theme) => {
  const P_EM = 0.9, VIEW = 20.5, P_H = 16;
  const size = `${(P_EM * VIEW) / P_H}em`;
  return `<span class="wordmark">${H.mark(size, theme).replace("<svg ", `<svg style="vertical-align:-${P_EM / P_H}em" `)}ublishub</span>`;
};

/* ---- pixel icons (7x7), from components/ui/Pixel.tsx ---- */
const ICONS = {
  pass: [".......", "......X", ".....X.", "X...X..", ".X.X...", "..X....", "......."],
  fail: ["X.....X", ".X...X.", "..X.X..", "...X...", "..X.X..", ".X...X.", "X.....X"],
  inconclusive: [".XXXX..", "X....X.", ".....X.", "...XX..", "...X...", ".......", "...X..."],
  running: [".X.....", ".XX....", ".XXX...", ".XXXX..", ".XXX...", ".XX....", ".X....."],
  star: ["...X...", "...X...", "..XXX..", "XXXXXXX", "..XXX..", "...X...", "...X..."],
  arrow: [".......", "...X...", "....X..", "XXXXXX.", "....X..", "...X...", "......."],
  box: ["XXXXXXX", "X.....X", "X.....X", "X.....X", "X.....X", "X.....X", "XXXXXXX"],
  dot: [".......", "..XXX..", ".XXXXX.", ".XXXXX.", ".XXXXX.", "..XXX..", "......."],
};
H.icon = (name, size = 26, color = "currentColor") => {
  const out = [];
  ICONS[name].forEach((row, y) => {
    let s = -1;
    for (let x = 0; x <= row.length; x++) {
      if (row[x] === "X" && s < 0) s = x;
      if (row[x] !== "X" && s >= 0) { out.push(`<rect x="${s}" y="${y}" width="${x - s}" height="1"/>`); s = -1; }
    }
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 7 7" shape-rendering="crispEdges" fill="${color}" aria-hidden="true">${out.join("")}</svg>`;
};
const C = { pass: "var(--pass)", fail: "var(--fail)", warn: "var(--warn)", acc: "var(--accent)", mute: "var(--muted)", tPass: "#57d98c", tFail: "#ff6b75", tWarn: "#ffbf69", tAcc: "#6e74f7", tMute: "#a9aac2" };
H.C = C;

/* ---- windows ---- */
H.win = ({ title = "", badge = "", url = "", body = "", cls = "", style = "" }) => `
  <div class="win ${cls}" style="${style}">
    <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span>
      ${url ? `<span class="urlbar">${url}</span>` : `<span class="win-title">${title}</span>`}
      ${badge ? `<span class="win-badge">${badge}</span>` : ""}
    </div>${body}</div>`;

/* terminal rows: [status, name, time] → aligned journey lines */
H.journey = (status, name, time = "") => {
  const map = { pass: ["pass", "PASS", "ok"], fail: ["fail", "FAIL", "no"], warn: ["inconclusive", "????", "wa"], run: ["running", "RUN", "m"] };
  const [ic, label, cl] = map[status];
  const col = { ok: C.tPass, no: C.tFail, wa: C.tWarn, m: C.tAcc }[cl];
  return `<div class="ln">${H.icon(ic, 20, col)}<span class="st ${cl}">${label}</span><span class="${status === "fail" ? "no" : ""}">${name}</span><span class="fill"></span><span class="m">${time}</span></div>`;
};

/* code editor lines: [lineNo, html, highlight?] */
H.code = (lines) => `<div class="code">${lines.map(([n, html, hl]) => `<div class="l${hl ? " hl" : ""}"><span class="n">${n}</span><span>${html}</span></div>`).join("")}</div>`;

/* ---- slide frame ---- */
H.frame = ({ theme = "dark", tag = "", index, total, body, swipe = true, beam = "top", cta = false }) => {
  const count = total > 1 ? `<span class="count">${index} / ${total}</span>` : "";
  const right = total > 1 && index < total && swipe
    ? `<span class="swipe">Swipe ${H.icon("arrow", 24, "currentColor")}</span>`
    : `<span class="swipe">${cta ? "Link in bio" : "getpublishub.com"}</span>`;
  return `
  <div class="frame ${theme}">
    <div class="bg-grid"></div><div class="bg-beam ${beam === "low" ? "low" : ""}"></div>
    <header class="top">${H.wordmark(theme)}<span class="tag">${tag ? `<span>${tag}</span>` : ""}${count}</span></header>
    <main>${body}</main>
    <footer class="bottom"><span class="url">getpublishub.com</span>${right}</footer>
  </div>`;
};

/* the standard closing slide used by most carousels */
H.ctaBlock = ({ kicker = "Early access is open", line = "Join the waitlist at getpublishub.com", note = "Publishub is in development. Joining the waitlist is free." } = {}) => `
  <div class="col" style="gap:28px">
    <span class="pill"><span class="sq"></span>${kicker}<span class="mute">· In development</span></span>
    <div><span class="cta">${line} ${H.icon("arrow", 30, "currentColor")}</span></div>
    <p class="disclaim">${note}</p>
  </div>`;

window.H = H;
