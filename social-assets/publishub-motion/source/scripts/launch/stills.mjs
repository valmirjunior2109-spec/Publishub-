// Quadros soltos do filme de lançamento para revisão: node scripts/launch/stills.mjs <saida> <V|H> t1 t2 …
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [out, fmt, ...times] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(process.cwd(), "src/index.ts") });
const id = fmt === "H" ? "LaunchLandscape" : "LaunchVertical";
const browserExecutable = process.env.REMOTION_CHROME || undefined;
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: "swangle" } });
for (const s of times) {
  const frame = Math.round(Number(s) * composition.fps);
  await renderStill({ serveUrl, composition, frame, output: join(out, `${fmt}-${String(s).padStart(5, "0")}.png`), browserExecutable, scale: 0.5, chromiumOptions: { gl: "swangle" } });
  console.log(fmt, s);
}
