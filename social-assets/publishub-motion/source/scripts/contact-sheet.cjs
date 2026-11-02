// Junta quadros exportados numa folha de contato, para revisão: node contact-sheet.cjs out.png w h cols a.png b.png ...
const path = require("path");
const sharp = require(path.resolve(__dirname, "../../../../frontend/node_modules/sharp"));
const [, , out, w, h, cols, ...files] = process.argv;
const W = +w, H = +h, N = +cols, pad = 12;
const rows = Math.ceil(files.length / N);
(async () => {
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(W, H).png().toBuffer()));
  await sharp({ create: { width: N * (W + pad) + pad, height: rows * (H + pad + 26) + pad, channels: 3, background: "#222" } })
    .composite([
      ...tiles.map((t, i) => ({ input: t, left: pad + (i % N) * (W + pad), top: pad + Math.floor(i / N) * (H + pad + 26) + 26 })),
      ...files.map((f, i) => ({ input: Buffer.from(`<svg width="${W}" height="24"><text x="0" y="18" font-family="monospace" font-size="16" fill="#fff">${path.basename(f)}</text></svg>`), left: pad + (i % N) * (W + pad), top: pad + Math.floor(i / N) * (H + pad + 26) })),
    ])
    .png()
    .toFile(out);
  console.log("ok", out);
})();
