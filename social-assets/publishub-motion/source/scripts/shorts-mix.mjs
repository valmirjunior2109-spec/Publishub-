// A mixagem dos filmes curtos: lê src/shorts/specs.json. Saída: public/shorts/<id>.wav.
//
//   node scripts/shorts-mix.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mixdown } from "./film/audio.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SPECS = JSON.parse(readFileSync(join(here, "../src/shorts/specs.json"), "utf8"));

for (const spec of SPECS) {
  const lines = spec.scenes.flatMap((s) => s.lines ?? []);
  mixdown({
    seconds: Math.round((spec.beats * 60 * 60) / spec.bpm) / 60,
    bpm: spec.bpm,
    music: spec.music,
    clicks: spec.clicks,
    shots: spec.scenes.filter((s) => s.type === "shot").map((s) => s.from),
    typed: lines.filter((l) => l.at >= 0).map((l) => [l.at, l.beats]),
    out: join(here, `../public/shorts/${spec.id}.wav`),
  });
}
