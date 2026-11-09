/**
 * O próprio site precisa passar no WCAG 2.2 AA (vendemos acessibilidade).
 * Roda o axe-core nas páginas públicas, no desktop e no celular, nos temas claro e escuro,
 * com todos os <details> abertos, e falha (exit 1) se houver violação séria ou crítica.
 * COLOR_SCHEMES=light (ou dark) roda um tema só.
 *
 *   npm run build && npm run start      (em outro terminal)
 *   npm run test:a11y                    (BASE_URL=http://localhost:3000 por padrão)
 *
 * Navegador: CHROME_REMOTE_URL (um Chrome já aberto com --remote-debugging-port), CHROME_EXECUTABLE_PATH,
 * um Chrome/Edge instalado ou o @sparticuz/chromium (Linux).
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/scanner", "/scan/sample", "/shopify-ada-compliance-checker", "/accessibility-statement", "/privacy", "/terms", "/admin", "/reserve/success", "/this-page-does-not-exist"];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];
const SCHEMES = (process.env.COLOR_SCHEMES || "light,dark").split(",").map((scheme) => scheme.trim()).filter(Boolean);
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const FAILING = new Set(["serious", "critical"]);

function browserPath() {
  if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

async function launch() {
  if (process.env.CHROME_REMOTE_URL) return puppeteer.connect({ browserURL: process.env.CHROME_REMOTE_URL });
  const local = browserPath();
  if (local) return puppeteer.launch({ executablePath: local, headless: true, args: ["--no-first-run", "--disable-gpu"] });
  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" });
}

const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const browser = await launch();
let failures = 0;
let warnings = 0;

try {
  for (const scheme of SCHEMES)
  for (const viewport of VIEWPORTS) {
    for (const path of PAGES) {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "prefers-color-scheme", value: scheme },
      ]);
      const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2", timeout: 30_000 });
      // o conteúdo das perguntas e dos detalhes também precisa passar
      await page.evaluate(() => document.querySelectorAll("details").forEach((details) => details.setAttribute("open", "")));
      await page.evaluate(axeSource);
      const violations = await page.evaluate(async (tags) => (await window.axe.run(document, { runOnly: { type: "tag", values: tags } })).violations, TAGS);
      const blocking = violations.filter((violation) => FAILING.has(violation.impact));
      failures += blocking.length;
      warnings += violations.length - blocking.length;
      const status = blocking.length ? "FAIL" : "ok  ";
      console.log(`${status} ${scheme.padEnd(5)} ${viewport.name.padEnd(7)} ${path} (HTTP ${response?.status() ?? "?"}) ${violations.length ? `· ${violations.length} finding(s)` : ""}`);
      for (const violation of violations) {
        console.log(`       ${FAILING.has(violation.impact) ? "✗" : "·"} [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length})`);
        for (const node of violation.nodes.slice(0, 3)) console.log(`           ${node.target.join(" ")}`);
      }
      await page.close();
    }
  }
} finally {
  if (process.env.CHROME_REMOTE_URL) await browser.disconnect();
  else await browser.close();
}

console.log(`\n${failures} serious/critical violation(s), ${warnings} minor/moderate finding(s).`);
process.exit(failures ? 1 : 0);
