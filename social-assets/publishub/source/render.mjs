// Publishub · campanha social: exporta as peças em PNG.
//
//   node render.mjs            → as duas peças
//   node render.mjs instagram  → só uma
//
// Usa o Edge ou o Chrome instalados (modo headless), sem dependências: abre cada
// HTML no tamanho exato da peça e salva a captura em ../ (social-assets/publishub).
// Para usar outro navegador: BROWSER="C:\caminho\chrome.exe" node render.mjs

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..");

const PIECES = {
  instagram: { html: "instagram.html", png: "publishub-instagram-1080x1350.png", width: 1080, height: 1350 },
  x: { html: "x.html", png: "publishub-x-1600x900.png", width: 1600, height: 900 },
};

const CANDIDATES = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const browser = CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error("Nenhum Chrome/Edge encontrado. Defina BROWSER com o caminho do executável.");
  process.exit(1);
}

/** Lê largura e altura do cabeçalho do PNG, para conferir a captura. */
function pngSize(file) {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Espera o PNG existir e parar de crescer (até 30 s). */
async function settle(file) {
  let last = -1;
  for (let i = 0; i < 120; i++) {
    const size = existsSync(file) ? statSync(file).size : 0;
    if (size > 0 && size === last) return;
    last = size;
    await sleep(250);
  }
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PIECES);

for (const name of names) {
  const piece = PIECES[name];
  if (!piece) {
    console.error(`Peça desconhecida: ${name}. Opções: ${Object.keys(PIECES).join(", ")}`);
    process.exit(1);
  }
  const target = join(out, piece.png);
  rmSync(target, { force: true });
  const profile = mkdtempSync(join(tmpdir(), "publishub-render-"));
  spawnSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--force-color-profile=srgb",
      "--disable-lcd-text", // sem ClearType: nada de franja colorida nas letras
      "--allow-file-access-from-files",
      `--user-data-dir=${profile}`,
      `--window-size=${piece.width},${piece.height}`,
      "--virtual-time-budget=4000",
      `--screenshot=${target}`,
      pathToFileURL(join(here, piece.html)).href,
    ],
    { stdio: "ignore" },
  );
  // no Windows o executável pode voltar antes da captura: espera o arquivo assentar
  await settle(target);
  // o navegador pode ainda segurar o perfil temporário: limpar é melhor esforço
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {}

  if (!existsSync(target) || statSync(target).size === 0) {
    console.error(`✗ ${piece.png}: a captura falhou`);
    process.exitCode = 1;
    continue;
  }
  const size = pngSize(target);
  const ok = size.width === piece.width && size.height === piece.height;
  console.log(`${ok ? "✓" : "✗"} ${piece.png}  ${size.width}×${size.height}`);
  if (!ok) process.exitCode = 1;
}
