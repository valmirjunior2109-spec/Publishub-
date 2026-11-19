// Export every slide to PNG (1080 × 1350, 4:5) with the pre-installed Playwright Chromium.
// Usage (from this folder): node render.mjs            → all posts
//                           node render.mjs 03 07      → only those posts
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "..");
const only = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "slide.html")).href);
const posts = await page.evaluate(() => POSTS.map((p) => ({ id: p.id, slug: p.slug, type: p.type, n: p.slides.length })));
const manifest = [];

for (const p of posts) {
  if (only.length && !only.includes(p.id)) continue;
  const files = [];
  const dir = p.type === "static" ? path.join(out, "creatives") : path.join(out, "carousels", `${p.id}-${p.slug}`);
  if (p.type !== "static") rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= p.n; i++) {
    await page.evaluate(([id, n]) => window.renderSlide(id, n), [p.id, i]);
    // fail loudly if anything overflows the 1080 × 1350 frame or its main area
    const overflow = await page.evaluate(() => {
      const m = document.querySelector("main");
      const bad = [];
      if (m.scrollHeight > m.clientHeight + 1) bad.push(`main overflows by ${m.scrollHeight - m.clientHeight}px`);
      for (const el of document.querySelectorAll("main *")) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > 1081 || r.left < -1)) { bad.push(`${el.tagName}.${el.className} x ${Math.round(r.left)}..${Math.round(r.right)}`); break; }
      }
      return bad;
    });
    if (overflow.length) console.warn(`  ! ${p.id} slide ${i}: ${overflow.join("; ")}`);
    const name = p.type === "static" ? `${p.id}-${p.slug}.png` : `slide-${String(i).padStart(2, "0")}.png`;
    await page.locator(".frame").screenshot({ path: path.join(dir, name) });
    files.push(path.relative(out, path.join(dir, name)));
  }
  manifest.push({ id: p.id, files });
  console.log(`${p.id} ${p.slug}: ${p.n} file(s)`);
}
if (!only.length) writeFileSync(path.join(here, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
