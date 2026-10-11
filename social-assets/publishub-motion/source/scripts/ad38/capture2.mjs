// Abre a página do resultado real (perfil do Edge com o token de convidado), em inglês e
// no tema escuro, espera a análise terminar e salva a página inteira, o texto e a
// posição dos blocos principais (para os destaques animados do anúncio).
//   node capture2.mjs <porta> <url> <pasta-saida> <prefixo> [esperaMax s]
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [port, url, outDir, prefix, waitMax = "300", action = ""] = process.argv.slice(2);
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await send("Emulation.setDeviceMetricsOverride", { width: 432, height: 768, deviceScaleFactor: 2.5, mobile: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await send("Network.enable");
await send("Network.setExtraHTTPHeaders", { headers: { "Accept-Language": "en-US,en;q=0.9" } });
for (const domain of ["getpublishub.com", "www.getpublishub.com"]) {
  await send("Network.setCookie", { name: "NEXT_LOCALE", value: "en", domain, path: "/" });
}
await send("Page.enable");
await send("Page.navigate", { url });

const start = Date.now();
while (Date.now() - start < +waitMax * 1000) {
  await sleep(5000);
  const text = await evaluate("document.body.innerText");
  if (!/\bAnalyzing\b|Analysis in progress/.test(text)) break;
}
await sleep(3000);
// os blocos aparecem ao entrar na tela (Reveal): percorre a página antes de fotografar
const total = await evaluate("document.documentElement.scrollHeight");
for (let y = 0; y < total; y += 250) {
  await evaluate(`window.scrollTo(0, ${y})`);
  await sleep(350);
}
await evaluate("window.scrollTo(0, 0)");
await sleep(1200);
if (action === "markdone") {
  // marca a sugestão 01 como feita, pelo checkbox real
  await evaluate(`[...document.querySelectorAll('label, button')].find(el => el.textContent.trim() === 'Mark as done')?.click()`);
  await sleep(1500);
}
writeFileSync(join(outDir, `${prefix}.txt`), await evaluate("document.body.innerText"));

// posição de cada bloco com texto curto, em px CSS da página inteira
const blocks = await evaluate(`(() => {
  const out = [];
  for (const el of document.querySelectorAll('main *')) {
    const r = el.getBoundingClientRect();
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ');
    if (!own || r.width === 0) continue;
    out.push({ tag: el.tagName, text: own.slice(0, 90), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const v = document.querySelector('video');
  if (v) { const r = v.getBoundingClientRect(); out.unshift({ tag: 'VIDEO', text: '', x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }); }
  return out;
})()`);
writeFileSync(join(outDir, `${prefix}-blocks.json`), JSON.stringify(blocks, null, 1));

const height = await evaluate("document.documentElement.scrollHeight");
const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 432, height, scale: 1 } });
writeFileSync(join(outDir, `${prefix}-full.png`), Buffer.from(r.data, "base64"));
console.log("height", height, "blocks", blocks.length);
ws.close();
