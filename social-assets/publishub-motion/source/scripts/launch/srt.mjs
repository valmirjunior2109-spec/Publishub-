// As legendas em SRT (para subir junto no YouTube, X, TikTok e Instagram): todos os trechos de captions.json,
// inclusive os que a tela já escreve grandes. node scripts/launch/srt.mjs <saida.srt>
import { readFileSync, writeFileSync } from "node:fs";

const { chunks } = JSON.parse(readFileSync(new URL("../../src/launch/captions.json", import.meta.url)));
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const out = chunks.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`).join("\n");
writeFileSync(process.argv[2], out);
console.log(process.argv[2], chunks.length, "cues");
