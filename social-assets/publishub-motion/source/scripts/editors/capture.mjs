// Reel para editores: captura as telas reais do produto (390 px css, DSF 3 → 1170 px, tema escuro).
//
//   1. frontend: NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key \n//                NEXT_PUBLIC_API_URL=http://localhost:8000 npx next dev -p 3123
//   2. um Edge headless ouvindo na 9555:
//        msedge --headless=new --disable-gpu --remote-debugging-port=9555 --user-data-dir=<pasta absoluta> about:blank
//   3. node scripts/editors/capture.mjs   → public/editors/*.png
//
// A API e o login são simulados (mocks.mjs); a interface é a do frontend, sem retoque.
// O processing.png sai do processing_full.png cortado em y 1600 (altura 1610).
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { open } from "./cdp.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../../public/editors");
mkdirSync(OUT, { recursive: true });
const HIDE = `(()=>{const s=document.createElement('style');s.textContent='nextjs-portal,[data-nextjs-toast]{display:none!important} section .sticky{position:static!important}';document.head.appendChild(s)})()`;
const rectOf = (p, txt, closest = "section") => p.js(`(()=>{const el=[...document.querySelectorAll('h1,h2,h3,p,span,button,label')].find(e=>e.textContent.trim().toLowerCase().startsWith(${JSON.stringify(txt.toLowerCase())}));if(!el)return null;const s=${closest ? `el.closest(${JSON.stringify(closest)})` : "el"}||el;const r=s.getBoundingClientRect();return {x:Math.max(0,r.left+scrollX-0),y:r.top+scrollY,width:r.width,height:r.height}})()`);
const pad = (r, a = 10) => ({ x: 0, y: Math.max(0, r.y - a), width: 390, height: r.height + 2 * a });
async function page(state, path, until) {
  globalThis.REEL_STATE = state;
  const p = await open({ mocksPath: join(here, "mocks.mjs"), dsf: 3 });
  await p.go("http://localhost:3123" + path, 2000);
  console.log(state, path, "ready", await p.waitFor(until));
  await p.js(HIDE); await p.sleep(1500);
  return p;
}
const span = async (p, a, b, pa = 24, pb = 24) => { const r1 = await rectOf(p, a, null), r2 = await rectOf(p, b, null); if (!r1 || !r2) { console.log("missing", a, b); return null; } return { x: 0, y: r1.y - pa, width: 390, height: r2.y + r2.height - r1.y + pa + pb }; };
async function snap(p, name, clip) { if (!clip) return; await p.shot(`${OUT}/${name}.png`, clip); console.log(" ✓", name, JSON.stringify(clip)); }

// 1 · upload: empty and with the file chosen
let p = await page("pending", "/new-analysis", "document.body.innerText.length>200");
const up = await rectOf(p, "Send your video", null);
await snap(p, "upload_empty", { x: 0, y: 40, width: 390, height: 380 });
console.log("file", await p.js(`fetch("http://localhost:8000/sample.mp4").then(r=>r.blob()).then(b=>{const f=new File([b],"client_cut_v7_FINAL.mp4",{type:"video/mp4"});const dt=new DataTransfer();dt.items.add(f);const i=document.querySelector("input[type=file]");i.files=dt.files;i.dispatchEvent(new Event("change",{bubbles:true}));return b.size})`));
await p.sleep(2500);
await snap(p, "upload_file", { x: 0, y: 40, width: 390, height: 380 });
await snap(p, "upload_full", { x: 0, y: 0, width: 390, height: await p.js("document.documentElement.scrollHeight") });
await p.close();

// 2 · processing
p = await page("processing", "/results/a1", "document.body.innerText.length>300");
await snap(p, "processing", await span(p, "Analysis in progress", "Done", 34, 30));
await snap(p, "processing_full", { x: 0, y: 0, width: 390, height: await p.js("document.documentElement.scrollHeight") });
await p.close();

// 3 · result + cuts pending
p = await page("pending", "/results/a1", "document.documentElement.scrollHeight>2500");
await snap(p, "curve", pad(await rectOf(p, "Retention", "aside")));
await snap(p, "insight", pad(await rectOf(p, "Retention dropped here")));
await snap(p, "cuts_pending", pad(await rectOf(p, "publishub found")));
await snap(p, "cuts_head", await span(p, "publishub found", "Original 0:41", 30, 24));
await snap(p, "cuts_cards", await span(p, "0 accepted", "Accept at least", 20, 20));
await p.js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Accept all').click()`);
await p.sleep(1200);
await snap(p, "cuts_accepted", pad(await rectOf(p, "publishub found")));
await snap(p, "cuts_head_acc", await span(p, "publishub found", "Original 0:41", 30, 24));
await snap(p, "cuts_cards_acc", await span(p, "3 accepted", "Start the review over", 20, 20));
await snap(p, "apply_bar", await span(p, "3 cuts ·", "Apply 3 cuts", 24, 24));
await p.js(`[...document.querySelectorAll('[role=tab],button')].find(b=>b.textContent.trim()==='Action plan').click()`);
await p.sleep(1200);
const tabs = await rectOf(p, "Rewrites", null);
await snap(p, "plan", { x: 0, y: tabs.y - 10, width: 390, height: 640 });
await p.close();

// 4 · edited video ready
p = await page("done", "/results/a1", "document.documentElement.scrollHeight>2500");
const r = await rectOf(p, "Edited video ready", "section") || await rectOf(p, "publishub found");
await snap(p, "edit_done", pad(r));
await snap(p, "edit_ready", await span(p, "Edited video ready", "Review the cuts again", 34, 20));
await p.close();
