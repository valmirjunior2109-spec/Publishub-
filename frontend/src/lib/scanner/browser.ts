import type { Browser } from "puppeteer-core";

/**
 * Abre o Chromium do scanner.
 * - Com CHROME_EXECUTABLE_PATH: o Chrome/Edge instalado na máquina (desenvolvimento e o worker,
 *   se ele tiver um Chrome próprio).
 * - Sem ela: o Chromium enxuto do @sparticuz/chromium, feito para funções serverless (Vercel)
 *   e que também roda em qualquer Linux x64 (o worker na Railway ou na Fly.io).
 */
export async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  // só em desenvolvimento: um Chrome/Edge já aberto com --remote-debugging-port
  if (process.env.CHROME_REMOTE_URL) return puppeteer.connect({ browserURL: process.env.CHROME_REMOTE_URL });
  const localPath = process.env.CHROME_EXECUTABLE_PATH;
  if (localPath) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: ["--no-first-run", "--disable-gpu", "--disable-dev-shm-usage"],
    });
  }
  // O @sparticuz/chromium só descompacta as bibliotecas do sistema (libnss3, libnspr4…) quando
  // reconhece o ambiente: na Vercel, pela variável VERCEL, que só existe se o projeto expõe as
  // variáveis de sistema. Sem ela, o Chromium abre sem as bibliotecas e falha. Em Linux de
  // servidor, avisamos o pacote antes de importá-lo (o teste dele roda na importação).
  if (process.platform === "linux") process.env.AWS_LAMBDA_JS_RUNTIME ??= `nodejs${process.versions.node.split(".")[0]}.x`;
  const chromium = (await import("@sparticuz/chromium")).default;
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });
}
