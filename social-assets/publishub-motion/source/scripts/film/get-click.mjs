// O clique do filme é a gravação de um mouse de verdade: "Computer mouse single click", de Darklanlan,
// CC0 no Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Computer_mouse_single_click.ogg).
// Baixa o arquivo e converte para WAV mono de 48 kHz, que make-sound-film.mjs lê. Saída: public/film/click-src.wav.
//
//   node scripts/film/get-click.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const URL = "https://upload.wikimedia.org/wikipedia/commons/2/26/Computer_mouse_single_click.ogg";
const FFMPEG = join(here, "../../node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const OUT = join(here, "../../public/film/click-src.wav");

const response = await fetch(URL, { headers: { "User-Agent": "PublishubMotion/1.0 (https://www.getpublishub.com)" } });
if (!response.ok) throw new Error(`Commons respondeu ${response.status}`);
const dir = mkdtempSync(join(tmpdir(), "click-"));
const source = join(dir, "click.ogg");
writeFileSync(source, Buffer.from(await response.arrayBuffer()));
mkdirSync(dirname(OUT), { recursive: true });
execFileSync(FFMPEG, ["-v", "error", "-y", "-i", source, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", OUT]);
rmSync(dir, { recursive: true });
console.log("✓", OUT);
