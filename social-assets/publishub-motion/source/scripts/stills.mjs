// Exporta quadros soltos para revisão visual, empacotando o projeto uma vez só.
//
//   node scripts/stills.mjs Reels out/v2 10 150 300
//   node scripts/stills.mjs X out/x1 10 150 300

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [id, outDir, ...frames] = process.argv.slice(2);
const out = resolve(outDir);
mkdirSync(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: join(here, "../src/index.ts") });
const composition = await selectComposition({ serveUrl, id });
for (const f of frames.map(Number)) {
  const file = join(out, `${id.toLowerCase()}-${String(f).padStart(3, "0")}.png`);
  await renderStill({ composition, serveUrl, output: file, frame: f, imageFormat: "png" });
  console.log("✓", file);
}
