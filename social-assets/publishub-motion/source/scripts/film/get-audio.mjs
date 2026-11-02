// A música e os efeitos do filme: gravações de verdade do Mixkit (https://mixkit.co/license/), livres para uso comercial, em
// YouTube, redes sociais e anúncios online, sem crédito obrigatório. Não vale para TV, rádio, CD/DVD nem jogos, e os arquivos
// não podem ser redistribuídos sozinhos: por isso ficam fora do git, e este script baixa. Saída: public/film/audio/*.wav.
//
//   node scripts/film/get-audio.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FFMPEG = join(here, "../../node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const OUT = join(here, "../../public/film/audio");
const SFX = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
const FILES = {
  "tech-house-vibes": "https://assets.mixkit.co/music/130/130.mp3",
  "motivating-mornings": "https://assets.mixkit.co/music/33/33.mp3",
  click: SFX(1113), // Mouse click close
  whoosh: SFX(1490), // Fast whoosh transition
  typing: SFX(2531), // Typing on a laptop keyboard
};

mkdirSync(OUT, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), "audio-"));
for (const [name, url] of Object.entries(FILES)) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const source = join(dir, `${name}.mp3`);
  writeFileSync(source, Buffer.from(await response.arrayBuffer()));
  execFileSync(FFMPEG, ["-v", "error", "-y", "-i", source, "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", join(OUT, `${name}.wav`)]);
  console.log("✓", name);
}
rmSync(dir, { recursive: true });
