// Demo do Product Hunt: captura cada estado real da interface em desktop (1440×900 css, DSF 2, tema claro)
// e as posições (em px css da página) dos botões que o cursor vai clicar.
// Saída: public/ph/*.png (fora do git) e src/ph/rects.json.
//
//   1. frontend: NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key \n//                NEXT_PUBLIC_API_URL=http://localhost:8000 npx next dev -p 3123
//   2. um Edge headless ouvindo na 9555 (--remote-debugging-port=9555, --user-data-dir com caminho absoluto)
//   3. node scripts/ph/capture.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { open } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../../public/ph");
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3123";
const MOCKS = join(here, "mocks.mjs");
const HIDE = `(()=>{const s=document.createElement('style');s.textContent='nextjs-portal{display:none!important}';document.head.appendChild(s)})()`;
const rects = {};

const rectJs = (sel) => `(()=>{const e=${sel};if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left+scrollX),y:Math.round(r.top+scrollY),w:Math.round(r.width),h:Math.round(r.height)}})()`;
const byText = (tags, text, closest) => `[...document.querySelectorAll('${tags}')].find(e=>e.textContent.trim().toLowerCase().startsWith(${JSON.stringify(text.toLowerCase())}))${closest ? `?.closest('${closest}')` : ""}`;

async function viewportShot(p, name) {
  await p.js("window.scrollTo(0,0); true"); await p.sleep(400);
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64"));
  console.log("✓", name);
}
async function fullShot(p, name) {
  const h = await p.js("document.documentElement.scrollHeight");
  await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: h, deviceScaleFactor: 2, mobile: false });
  await p.sleep(1500);
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64"));
  console.log("✓", name, "h", h);
  return h;
}
async function page(path, until, { auth = true, state } = {}) {
  globalThis.PH_STATE = state;
  const p = await open({ mocksPath: MOCKS, dsf: 2, w: 1440, h: 900, auth });
  if (!auth) {
    await p.go(BASE + "/privacy", 2500);
    await p.js("localStorage.clear(); sessionStorage.clear(); localStorage.setItem('publishub.theme','light'); true");
  }
  await p.go(BASE + path, 2500);
  const ok = await p.waitFor(until, 40000);
  await p.js(HIDE); await p.sleep(2500);
  console.log(path, state || "", ok);
  return p;
}

// A · a landing, sem sessão
let p = await page("/", "location.pathname==='/' && document.body.innerText.includes('Fix plan')", { auth: false });
await viewportShot(p, "landing");
rects.landingCta = await p.js(rectJs(byText("a,button", "Analyze your video for free")));
await p.close();

// B · o envio: vazio e com o arquivo escolhido
p = await page("/new-analysis", "document.body.innerText.includes('Send your video')");
rects.dropzone = await p.js(rectJs(`document.querySelector('input[type=file]')?.closest('label,div')`));
await viewportShot(p, "upload_empty");
console.log("file", await p.js(`fetch("http://localhost:8000/sample.mp4").then(r=>r.blob()).then(b=>{const f=new File([b],"client_cut_v7_FINAL.mp4",{type:"video/mp4"});const dt=new DataTransfer();dt.items.add(f);const i=document.querySelector("input[type=file]");i.files=dt.files;i.dispatchEvent(new Event("change",{bubbles:true}));return b.size})`));
await p.sleep(2000);
await viewportShot(p, "upload_file");
rects.analyze = await p.js(rectJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Analyze')`));
await p.close();

// C · a análise em andamento, etapa por etapa (as etapas reais do backend)
for (const state of ["received", "transcribing", "aligning", "diagnosing"]) {
  p = await page("/results/a1", "document.body.innerText.includes('Analysis in progress')", { state });
  await viewportShot(p, `processing_${state}`);
  if (state === "received") rects.steps = await p.js(rectJs(byText("p,span,h2", "Analysis in progress", "section,div.rounded-2xl,div.rounded-xl")));
  await p.close();
}

// D · pronta: o resultado, os cortes pendentes, e o plano
p = await page("/results/a1", "document.body.innerText.includes('stretches to cut')", { state: "pending" });
const h1 = await fullShot(p, "result_pending");
rects.pageH = h1;
rects.drop = await p.js(rectJs(byText("h2,p,span", "Retention dropped here", "section")));
rects.cuts = await p.js(rectJs(byText("h2", "publishub found", "section")));
rects.acceptAll = await p.js(rectJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Accept all')`));
rects.apply = await p.js(rectJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Apply'))`));
rects.tabPlan = await p.js(rectJs(`[...document.querySelectorAll('[role=tab],button')].find(b=>b.textContent.trim()==='Action plan')`));
// E · aceitar todos
await p.js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Accept all').click()`);
await p.sleep(1500);
await fullShot(p, "result_accepted");
rects.applyAccepted = await p.js(rectJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Apply'))`));
// G · o plano de ação
await p.js(`[...document.querySelectorAll('[role=tab],button')].find(b=>b.textContent.trim()==='Action plan').click()`);
await p.sleep(1500);
await fullShot(p, "result_plan");
rects.planPanel = await p.js(rectJs(byText("p,span,h2,h3", "Fix plan", "div")));
rects.tabs = await p.js(rectJs(`[...document.querySelectorAll('[role=tablist]')][0]`));
await p.close();

// F · o vídeo editado pronto
p = await page("/results/a1", "document.body.innerText.includes('Edited video ready') || document.body.innerText.includes('EDITED VIDEO READY')", { state: "done" });
await fullShot(p, "result_done");
rects.done = await p.js(rectJs(byText("p,span,h2,h3", "Your video, with the cuts", "section")));
rects.ready = await p.js(rectJs(byText("p,span", "Edited video ready")));
await p.close();

writeFileSync(join(here, "../../src/ph/rects.json"), JSON.stringify(rects, null, 2));
console.log(JSON.stringify(rects));
