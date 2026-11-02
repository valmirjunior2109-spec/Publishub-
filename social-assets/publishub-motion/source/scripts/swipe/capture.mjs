// Reel "Swipe": recorta a tela de análise da landing (tema escuro), em inglês e em português.
// Só as colunas da queda e do plano: a coluna do vídeo fica de fora. Saída em public/swipe/<lang>/.
//
// Precisa do site em localhost:3123 (next dev) e de um Edge com --remote-debugging-port=9555.
//   node scripts/swipe/capture.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(lang, path) {
  const out = join(here, "../../public/swipe", lang === "en" ? "en" : "pt");
  mkdirSync(out, { recursive: true });
  const rectsFile = join(here, `../../src/swipe/rects.${lang === "en" ? "en" : "pt"}.json`);
  mkdirSync(dirname(rectsFile), { recursive: true });
  const target = await (await fetch("http://127.0.0.1:9555/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCookie", { name: "NEXT_LOCALE", value: lang, url: "http://localhost:3123/" });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 3, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "try{localStorage.setItem('publishub.theme','dark')}catch(e){}" });
  await send("Page.navigate", { url: `http://localhost:3123${path}` });
  await sleep(9000);
  await js("document.fonts.ready.then(() => true)");

  const rects = await js(`(() => {
    const grid = [...document.querySelectorAll('main .grid')].find((g) => g.className.includes('lg:grid-cols-[248px'));
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; };
    const drop = grid.children[1];
    const plan = grid.children[2];
    const dot = [...drop.querySelectorAll("svg circle")].find((c) => c.getBoundingClientRect().width > 0);
    const final = [...plan.children].at(-1);
    const items = [...plan.querySelectorAll('li')];
    return { drop: box(drop), quote: box(drop.querySelector("[class*=border-l-2]")), dot: box(dot), final: box(final), plan: box(plan), items: items.map(box), accept: box(items[2].querySelector('button, [role=button], span[class*="h-7"], div[class*="h-7"]') ?? items[2]) };
  })()`);
  const shot = async (name, clip) => {
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, clip: { ...clip, scale: 1 } });
    writeFileSync(join(out, name), Buffer.from(r.data, "base64"));
  };
  await shot("drop.png", rects.drop);
  await shot("plan.png", rects.plan);
  writeFileSync(rectsFile, JSON.stringify(rects, null, 2));
  console.log(lang, JSON.stringify(rects));
  ws.close();
  await fetch(`http://127.0.0.1:9555/json/close/${target.id}`);
}

await capture("en", "/");
await capture("pt-BR", "/pt");
