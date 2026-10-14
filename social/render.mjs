// Publishub · renderiza os posts de content/*.json em PNG, na pasta out/.
//
//   npm run social                    → todos os posts
//   npm run social -- previsao-cega   → só os que têm esse id (ou parte dele)
//
// Para cada slide: abre o template do formato no tamanho exato, chama
// window.renderSlide (lib/render-post.js), confere o relatório (texto que não
// coube, fora da área segura ou abaixo do tamanho mínimo) e salva o PNG.
// Qualquer erro no relatório faz o comando terminar com código 1.
//
// Usa o Chrome instalado na máquina; sem ele, o Chromium do Playwright
// (`npx playwright install chromium`).

import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, "content");
const outDir = join(here, "out");

const FORMATS = {
  carousel: { width: 1080, height: 1350, slides: [5, 8] },
  post: { width: 1080, height: 1350, slides: [1, 1] },
  story: { width: 1080, height: 1920, slides: [1, 1] },
  x: { width: 1600, height: 900, slides: [1, 1] },
};

async function launch() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return await chromium.launch();
  }
}

/** Confere o JSON antes de abrir o navegador: o erro aponta o arquivo e o campo. */
function validate(post, file) {
  const problems = [];
  const format = FORMATS[post.format];
  if (!post.id) problems.push('falta "id"');
  if (!format) problems.push(`"format" precisa ser um de: ${Object.keys(FORMATS).join(", ")}`);
  if (!Array.isArray(post.slides) || !post.slides.length) problems.push('falta "slides" (uma lista)');
  else if (format) {
    const [min, max] = format.slides;
    if (post.slides.length < min || post.slides.length > max) problems.push(`${post.format} pede de ${min} a ${max} slide(s); este tem ${post.slides.length}`);
    if (post.format === "carousel") {
      if (post.slides[0].layout !== "cover") problems.push('o carrossel começa com um slide "cover"');
      if (post.slides.at(-1).layout !== "cta") problems.push('o carrossel termina com um slide "cta"');
    }
  }
  if (problems.length) throw new Error(`${file}: ${problems.join("; ")}`);
}

const filters = process.argv.slice(2);
const files = readdirSync(contentDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
const posts = files
  .map((file) => ({ file, post: JSON.parse(readFileSync(join(contentDir, file), "utf8")) }))
  .filter(({ post }) => !filters.length || filters.some((f) => post.id?.includes(f)));

if (!posts.length) {
  console.error(filters.length ? `Nenhum post com id contendo: ${filters.join(", ")}` : "Nenhum JSON em content/.");
  process.exit(1);
}
for (const { post, file } of posts) validate(post, file);

mkdirSync(outDir, { recursive: true });
const browser = await launch();
let failed = 0;

for (const { post, file } of posts) {
  const format = FORMATS[post.format];
  const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  const template = pathToFileURL(join(here, "templates", `${post.format}.html`)).href;

  // os PNGs antigos deste post saem antes (um carrossel que perdeu um slide não deixa sobra)
  for (const old of readdirSync(outDir)) if (old === `${post.id}.png` || old.startsWith(`${post.id}-`)) rmSync(join(outDir, old));

  for (let i = 0; i < post.slides.length; i++) {
    await page.goto(template);
    let report;
    try {
      report = await page.evaluate(([p, index]) => window.renderSlide(p, index), [post, i]);
    } catch (err) {
      report = { errors: [err.message.split("\n")[0]], warnings: [], placeholders: [] };
    }
    report.errors.push(...pageErrors.splice(0));

    const name = post.slides.length > 1 ? `${post.id}-${String(i + 1).padStart(2, "0")}.png` : `${post.id}.png`;
    await page.screenshot({ path: join(outDir, name), clip: { x: 0, y: 0, width: format.width, height: format.height } });

    const status = report.errors.length ? "ERRO" : "ok  ";
    console.log(`${status} ${name}  (${file}, slide ${i + 1}: ${post.slides[i].layout})`);
    for (const e of report.errors) console.log(`       ✗ ${e}`);
    for (const w of report.warnings) console.log(`       · ${w}`);
    if (report.placeholders.length) console.log(`       · placeholders para trocar: ${[...new Set(report.placeholders)].join(" ")}`);
    if (report.errors.length) failed++;
  }
  await page.close();
}

// a folha de contato: todos os PNGs de out/ numa imagem só, para revisar de relance
// (embutidos em base64: uma página aberta com setContent não carrega file://)
const shots = readdirSync(outDir).filter((f) => f.endsWith(".png") && !f.startsWith("_")).sort();
if (shots.length) {
  const sheet = await browser.newPage({ viewport: { width: 2200, height: 800 }, deviceScaleFactor: 1 });
  const cells = shots.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(join(outDir, f)).toString("base64")}"><figcaption>${f}</figcaption></figure>`).join("");
  await sheet.setContent(`<style>body{margin:0;padding:40px;background:#e9e0d0;font:22px "Geist Mono",monospace;color:#5c544b;display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;width:2120px}figure{margin:0}img{display:block;height:420px;box-shadow:0 1px 3px rgba(0,0,0,.15)}figcaption{margin-top:10px}</style>${cells}`);
  await sheet.waitForFunction(() => [...document.images].every((img) => img.complete));
  await sheet.screenshot({ path: join(outDir, "_folha-de-contato.png"), fullPage: true });
  await sheet.close();
}

await browser.close();
console.log(failed ? `\n${failed} slide(s) com problema. Corrija o JSON (texto mais curto) e rode de novo.` : `\nPronto: PNGs em ${outDir}`);
process.exit(failed ? 1 : 0);
