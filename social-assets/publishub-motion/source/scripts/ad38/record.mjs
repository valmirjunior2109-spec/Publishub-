// Grava o teste grátis real do getpublishub.com num Edge headless (DevTools Protocol):
// envia o Reel de demonstração, filma a tela durante o envio e a análise e, no fim,
// salva capturas do resultado e o texto da página.
//   node record.mjs <porta-devtools> <video.mp4> <pasta-saida>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [port, videoPath, outDir] = process.argv.slice(2);
const SITE = "https://getpublishub.com";
mkdirSync(join(outDir, "cast"), { recursive: true });

const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pending = new Map();
const handlers = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
  } else if (msg.method && handlers.has(msg.method)) handlers.get(msg.method)(msg.params);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// celular: 432 × 768 a 2,5× dá exatamente 1080 × 1920
await send("Emulation.setDeviceMetricsOverride", { width: 432, height: 768, deviceScaleFactor: 2.5, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await send("Network.enable");
await send("Network.setExtraHTTPHeaders", { headers: { "Accept-Language": "en-US,en;q=0.9" } });
await send("Network.setCookie", { name: "NEXT_LOCALE", value: "en", domain: "getpublishub.com", path: "/" });
await send("Page.enable");
await send("Runtime.enable");

// filmagem: cada quadro que muda na tela, com o instante em que chegou
const frames = [];
handlers.set("Page.screencastFrame", ({ data, sessionId, metadata }) => {
  const name = `f${String(frames.length).padStart(5, "0")}.jpg`;
  writeFileSync(join(outDir, "cast", name), Buffer.from(data, "base64"));
  frames.push({ name, t: metadata.timestamp });
  send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
const shot = async (name, opts = {}) => {
  const r = await send("Page.captureScreenshot", { format: "png", ...opts });
  writeFileSync(join(outDir, name), Buffer.from(r.data, "base64"));
  log("shot", name);
};

await send("Page.navigate", { url: `${SITE}/experimentar` });
await sleep(6000);
await shot("01-try.png");

await send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
await sleep(1500);

// o arquivo entra pelo input do Dropzone, como se a pessoa tivesse escolhido no celular
const input = await send("Runtime.evaluate", { expression: `document.querySelector('input[type="file"]')` });
await send("DOM.setFileInputFiles", { files: [videoPath], objectId: input.result.objectId });
await sleep(1500);
await shot("02-picked.png");
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Get the prediction')?.click()`);
log("submitted");

// espera a página do resultado e o fim da análise
let url = "";
for (let i = 0; i < 300; i++) {
  await sleep(2000);
  url = await evaluate("location.href");
  const text = await evaluate("document.body.innerText");
  if (i % 10 === 0) log(url, JSON.stringify(text.slice(0, 120)));
  if (/\/results\//.test(url) && /The bet|Drop detected at|Likely drop at|didn't finish/.test(text) && !/Analyzing|In the queue/.test(text)) break;
}
log("done", url);
await sleep(4000);
await send("Page.stopScreencast");
writeFileSync(join(outDir, "cast.json"), JSON.stringify(frames));

writeFileSync(join(outDir, "result.txt"), await evaluate("document.body.innerText"));
writeFileSync(join(outDir, "url.txt"), url);
await shot("10-result-top.png");
const height = await evaluate("document.documentElement.scrollHeight");
log("page height", height);
for (let y = 0, n = 0; y < height; y += 640, n++) {
  await evaluate(`window.scrollTo(0, ${y})`);
  await sleep(900);
  await shot(`11-scroll-${String(n).padStart(2, "0")}.png`);
}
await evaluate("window.scrollTo(0, 0)");
await sleep(800);
await shot("12-full.png", { captureBeyondViewport: true, clip: { x: 0, y: 0, width: 432, height, scale: 1 } });
ws.close();
log("finished");
