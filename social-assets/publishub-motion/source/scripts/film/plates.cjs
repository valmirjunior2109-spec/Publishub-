// Recorta das capturas (public/film, 3 × 1440 px) os quadros que o filme usa, cada um com uma versão desfocada para o foco raso.
//   node scripts/film/plates.cjs
const path = require("path");
const fs = require("fs");
const sharp = require(path.resolve(__dirname, "../../../../../frontend/node_modules/sharp"));

const root = path.resolve(__dirname, "../../public/film");
const out = path.join(root, "plates");
fs.mkdirSync(out, { recursive: true });

const PLATES = [
  ["upload_empty", "upload_empty", 300, 20, 1100, 660],
  ["upload_file", "upload_file", 300, 20, 1100, 660],
  ["processing_received", "processing_received", 532, 97, 892, 494],
  ["processing_transcribing", "processing_transcribing", 532, 97, 892, 494],
  ["processing_aligning", "processing_aligning", 532, 97, 892, 494],
  ["processing_diagnosing", "processing_diagnosing", 532, 97, 892, 494],
  ["result_pending_top", "result_pending", 532, 97, 892, 410],
  ["cuts_pending", "result_pending", 532, 490, 892, 980],
  ["cuts_accepted", "result_accepted", 532, 490, 892, 980],
  ["done", "result_done", 770, 610, 640, 180],
  ["done_head", "result_done", 785, 630, 440, 72],
  ["second", "result_pending", 552, 128, 200, 84],
  ["plan", "result_plan", 532, 1510, 892, 1000],
  ["rewrites", "result_accepted", 532, 1470, 892, 420],
];

(async () => {
  for (const [name, source, x, y, w, h] of PLATES) {
    const cut = await sharp(path.join(root, `${source}.png`)).extract({ left: x * 3, top: y * 3, width: w * 3, height: h * 3 }).linear(1.38, 2).png().toBuffer();
    fs.writeFileSync(path.join(out, `${name}.png`), cut);
    await sharp(cut).resize({ width: Math.round(w * 1.5) }).blur(7).jpeg({ quality: 88 }).toFile(path.join(out, `${name}-blur.jpg`));
    console.log("✓", name, w * 3, h * 3);
  }
})();
