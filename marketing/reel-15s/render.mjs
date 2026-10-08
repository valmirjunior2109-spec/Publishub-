// Fotografa a scene.html quadro a quadro e monta o MP4 do Reel.
//
//   node render.mjs                      → publishub-reel-15s.mp4 (1080×1920, 30 fps, com áudio)
//   node render.mjs --stills 0.5,4.6,8.2 → stills/t-0.50.png … (para revisar o layout)
//
// Motion blur: cada quadro de saída é a média de sub-quadros espalhados por meio
// intervalo (obturador de 180°), como numa câmera de cinema: SAMPLES no geral e
// FAST_SAMPLES nos movimentos muito rápidos (FAST), onde poucas amostras viram
// cópias em degrau. A média é feita pelo blend.py, que entrega os quadros ao ffmpeg.
//
// Precisa do Playwright (o Chromium dele) e do ffmpeg no PATH. Defina
// PLAYWRIGHT_MODULE se o pacote não estiver resolvível a partir daqui, e
// CHROMIUM_PATH para usar um Chromium específico.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

const FPS = Number(opt("fps", 30));
const SAMPLES = Number(opt("samples", 4));
const FAST_SAMPLES = Number(opt("fast-samples", 16));
const SHUTTER = Number(opt("shutter", 0.5)); // fração do intervalo de um quadro
// os trechos de movimento mais rápido da scene.html, em segundos
const FAST = [
  [1.48, 1.8],   // o impacto da queda (tremida)
  [3.3, 3.9],    // o mergulho no "?" e a cortina
  [3.9, 4.4],    // o celular entrando
  [5.15, 5.85],  // o celular vira miniatura
  [7.35, 7.9],   // a rolagem até o plano
  [9.1, 9.6],    // o chicote
  [11.4, 11.9],  // os cortes somem
  [11.9, 12.35], // a barra vira papel
  [12.15, 12.7], // o caderno monta
];
const WORKERS = Number(opt("workers", Math.max(1, Math.min(6, os.cpus().length))));
const OUT = resolve(here, opt("out", "publishub-reel-15s.mp4"));
const WORK = resolve(opt("work", join(os.tmpdir(), "publishub-reel-frames")));
const STILLS = opt("stills", null);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"],
});

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(here, "scene.html")).href);
  await page.evaluate(() => window.__ready);
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}

async function shoot({ page, cdp }, t, file) {
  await page.evaluate((tt) => window.__render(tt), t);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
  writeFileSync(file, Buffer.from(data, "base64"));
}

if (STILLS) {
  const dir = join(here, "stills");
  mkdirSync(dir, { recursive: true });
  const w = await openPage();
  for (const t of STILLS.split(",").map(Number)) {
    await shoot(w, t, join(dir, `t-${t.toFixed(2)}.png`));
    console.log(`still ${t}s`);
  }
  await browser.close();
  process.exit(0);
}

const duration = 15;
const frames = Math.round(duration * FPS);
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

// a lista de sub-quadros: o quadro n é a média dos instantes em torno de n/FPS
const jobs = [];
const manifest = [];
for (let n = 0; n < frames; n++) {
  const tn = n / FPS;
  const count = FAST.some(([a, b]) => tn >= a && tn <= b) ? FAST_SAMPLES : SAMPLES;
  const files = [];
  for (let k = 0; k < count; k++) {
    const off = count > 1 ? (k / (count - 1) - 0.5) * SHUTTER : 0;
    const t = Math.min(duration - 1e-3, Math.max(0, (n + off) / FPS));
    const file = join(WORK, `s${String(jobs.length).padStart(6, "0")}.png`);
    jobs.push({ file, t });
    files.push(file);
  }
  manifest.push(files);
}

const started = Date.now();
let done = 0;
const workers = await Promise.all(Array.from({ length: WORKERS }, openPage));
await Promise.all(
  workers.map(async (w, wi) => {
    for (let j = wi; j < jobs.length; j += WORKERS) {
      const { file, t } = jobs[j];
      await shoot(w, t, file);
      if (++done % 200 === 0) console.log(`${done}/${jobs.length} sub-quadros · ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
  }),
);
await browser.close();

// a trilha
const wav = join(WORK, "audio.wav");
execFileSync("python3", [join(here, "soundtrack.py"), wav], { stdio: "inherit" });

// a média dos sub-quadros vira o quadro (blend.py → stdin do ffmpeg), codificado em H.264 + AAC
const manifestFile = join(WORK, "manifest.json");
writeFileSync(manifestFile, JSON.stringify(manifest));
const q = (x) => `'${String(x).replace(/'/g, "'\\''")}'`;
const ffmpeg = [
  "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
  "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-framerate", String(FPS), "-i", "-",
  "-i", wav,
  // RGB → YUV pela matriz BT.709, a mesma que o arquivo declara
  "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-profile:v", "high", "-level", "4.2",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-x264-params", "keyint=60:min-keyint=30",
  "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
  "-t", String(duration), "-movflags", "+faststart",
  OUT,
];
execFileSync("sh", ["-c", `python3 ${q(join(here, "blend.py"))} ${q(manifestFile)} - | ${ffmpeg.map(q).join(" ")}`], { stdio: "inherit" });

if (existsSync(OUT)) console.log(`pronto: ${OUT} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
