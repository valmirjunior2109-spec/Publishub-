// A mixagem do filme de lançamento. Saída: public/film/soundtrack.wav (a principal) e soundtrack-alt.wav (a outra música).
//
//   node scripts/film/mix.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mixdown } from "./audio.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "../../src/film/timeline.json"), "utf8"));
const typed = [[0, 3], [8, 2], ...T.cards.map((c) => [c.from, 0.9]), [104, 0.6], [106, 0.6], [108, 1.2]];
const common = { seconds: T.durationInFrames / T.fps, bpm: T.bpm, clicks: T.clicks, shots: T.shots, typed };

mixdown({ ...common, music: T.music.main, out: join(here, "../../public/film/soundtrack.wav") });
mixdown({ ...common, music: T.music.alt, out: join(here, "../../public/film/soundtrack-alt.wav") });
