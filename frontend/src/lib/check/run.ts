import type { Browser, HTTPRequest, Page } from "puppeteer-core";
import type { Locale } from "../i18n";
import { CHECK_TEXT } from "./text";
import { launchBrowser } from "./browser";
import type { CheckItem, CheckResult, CheckScreenshots, VisitedPage } from "./types";
import { assertPublicHost, isBlockedRequestHost } from "./url";

/**
 * O teste grátis (/check), sem banco: abre o app num Chromium de verdade, no desktop e no celular,
 * visita até MAX_PAGES páginas internas como um usuário faria, confere os links internos e
 * devolve as verificações. Nunca envia formulários, nunca faz login e nunca clica em nada que mude
 * dados: só abre páginas públicas. Quem chama (a rota da API ou o script de lote) guarda o resultado.
 */

export const USER_AGENT = "PublishubCheck/1.0 (+https://getpublishub.com/check)";
const DESKTOP_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Safari/537.36 ${USER_AGENT}`;
const MOBILE_UA = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 ${USER_AGENT}`;

/** Páginas internas visitadas no navegador, além da primeira. */
const MAX_PAGES = 3;
/** Links internos conferidos por HTTP (sem navegador). */
const MAX_LINKS = 25;
const MAX_ITEMS = 8;
const TEXT_MAX = 240;
/** Acima disso, "carrega devagar" (o tempo até o evento load). */
const SLOW_MS = 4000;

/** Links que podem mudar algo do lado do app (sair, apagar…): nunca são abertos. */
const UNSAFE_LINK = /log-?out|sign-?out|delete|remove|unsubscribe|cancel|destroy/i;
/** Os links que mais valem a visita: cadastro, login, preços, painel. */
const KEY_LINK = /sign-?up|register|get-?started|start|login|log-?in|sign-?in|pricing|plans?|dashboard|app|account|checkout|cart|contact|demo/i;

export interface CheckOptions {
  /** Prazo total, em ms: o que não couber fica de fora (e o relatório diz). */
  deadlineMs: number;
  /** O idioma do relatório (padrão: inglês). */
  locale?: Locale;
}

export interface CheckRun {
  result: CheckResult;
  screenshots: CheckScreenshots;
}

interface PageLog {
  jsErrors: string[];
  consoleErrors: string[];
  failed: { url: string; reason: string; sameOrigin: boolean; server: boolean }[];
  insecure: string[];
}

const clip = (text: string, max = TEXT_MAX) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function shortUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return clip(`${url.host}${url.pathname}${url.search}`, 140);
  } catch {
    return clip(raw, 140);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Uma aba com o bloqueio de rede interna e o registro de erros (JavaScript, console e rede). */
async function preparePage(browser: Browser, origin: string, mobile: boolean): Promise<{ page: Page; log: PageLog }> {
  const page = await browser.newPage();
  const log: PageLog = { jsErrors: [], consoleErrors: [], failed: [], insecure: [] };
  const blocked = new WeakSet<HTTPRequest>();

  await page.setUserAgent(mobile ? MOBILE_UA : DESKTOP_UA);
  await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { width: 1280, height: 800 });
  await page.setRequestInterception(true);

  page.on("request", (request: HTTPRequest) => {
    let host = "";
    try {
      host = new URL(request.url()).hostname;
    } catch {
      // data: e blob: não têm host e não saem para a rede
    }
    // vídeos e áudio não mudam o resultado e deixam o teste lento
    if ((host && isBlockedRequestHost(host)) || request.resourceType() === "media") {
      blocked.add(request);
      return void request.abort("blockedbyclient").catch(() => undefined);
    }
    return void request.continue().catch(() => undefined);
  });
  page.on("pageerror", (error) => {
    if (log.jsErrors.length < 50) log.jsErrors.push(clip(error instanceof Error ? error.message : String(error)));
  });
  page.on("console", (message) => {
    // "Failed to load resource" repete o que a verificação de rede já mostra
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource") && log.consoleErrors.length < 50) log.consoleErrors.push(clip(message.text()));
  });
  page.on("requestfailed", (request) => {
    if (blocked.has(request) || ignoredRequest(request)) return;
    const reason = request.failure()?.errorText ?? "failed";
    // a página trocou antes de o pedido terminar: não é um erro do app
    if (reason.includes("ERR_ABORTED")) return;
    log.failed.push({ url: request.url(), reason, sameOrigin: sameOrigin(request.url(), origin), server: false });
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !ignoredRequest(response.request())) log.failed.push({ url, reason: `HTTP ${status}`, sameOrigin: sameOrigin(url, origin), server: status >= 500 });
    if (origin.startsWith("https:") && url.startsWith("http:")) log.insecure.push(url);
  });
  return { page, log };
}

/**
 * Fora da verificação de rede: o documento da página (o status dele já está em "Page loads" e "Key pages
 * open") e o favicon que o navegador pede sozinho, que não quebra nada para quem usa o app.
 */
function ignoredRequest(request: HTTPRequest): boolean {
  if (request.resourceType() === "document" && request.isNavigationRequest()) return true;
  try {
    return /\/favicon\.ico$/i.test(new URL(request.url()).pathname);
  } catch {
    return false;
  }
}

function sameOrigin(raw: string, origin: string): boolean {
  try {
    return new URL(raw).origin === origin;
  } catch {
    return false;
  }
}

/** Abre a página e espera o app montar (SPAs terminam com JavaScript depois do load). */
async function open(page: Page, url: string, timeoutMs: number): Promise<{ status: number | null; loadMs: number }> {
  const started = Date.now();
  const response = await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
  const loadMs = Date.now() - started;
  await page.waitForNetworkIdle({ idleTime: 600, timeout: Math.min(5000, timeoutMs) }).catch(() => undefined);
  return { status: response ? response.status() : null, loadMs };
}

interface PageFacts {
  title: string | null;
  description: string | null;
  ogImage: boolean;
  viewport: boolean;
  notFound: boolean;
  links: { href: string; text: string }[];
}

/**
 * O que o teste lê da página. O corpo vai como texto para o navegador: assim nenhum helper do
 * compilador (o __name do esbuild/tsx, por exemplo) entra na função que roda dentro da página.
 */
const READ_FACTS = `(() => {
  const content = (selector) => { const el = document.querySelector(selector); return (el && el.content && el.content.trim()) || null; };
  const heading = ((document.querySelector("h1") || {}).textContent || "").trim();
  const title = document.title.trim();
  const body = (document.body && document.body.innerText) || "";
  return {
    title: title || null,
    description: content('meta[name="description"]'),
    ogImage: Boolean(content('meta[property="og:image"]')),
    viewport: Boolean(document.querySelector('meta[name="viewport"]')),
    notFound: /\\b404\\b|page not found|not found/i.test(title + " " + heading) || /^\\s*404\\b/.test(body),
    links: Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({ href: a.href, text: (a.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60) }))
      .filter((link) => /^https?:/.test(link.href)),
  };
})()`;

// SPAs (Vite, React Router, os modelos do Lovable) respondem 200 e mostram o "404" com JavaScript:
// por isso o "notFound" olha o título, o <h1> e o começo do texto da página.
async function readFacts(page: Page): Promise<PageFacts> {
  return (await page.evaluate(READ_FACTS)) as PageFacts;
}

/** Os links internos únicos (sem #, sem os que mudam dados), com os mais importantes primeiro. */
function internalLinks(links: PageFacts["links"], base: URL): { url: string; key: boolean }[] {
  const seen = new Set<string>([`${base.origin}${base.pathname}${base.search}`]);
  const found: { url: string; key: boolean }[] = [];
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      continue;
    }
    if (url.origin !== base.origin) continue;
    url.hash = "";
    const clean = `${url.origin}${url.pathname}${url.search}`;
    if (seen.has(clean) || UNSAFE_LINK.test(`${url.pathname} ${link.text}`)) continue;
    seen.add(clean);
    found.push({ url: clean, key: KEY_LINK.test(`${url.pathname} ${link.text}`) });
  }
  return found.sort((a, b) => Number(b.key) - Number(a.key));
}

/** Confere um link por HTTP, sem seguir redirecionamentos (um 3xx conta como funcionando). */
async function probe(url: string): Promise<{ url: string; status: number | null; error?: string }> {
  const request = (method: "HEAD" | "GET") =>
    fetch(url, { method, redirect: "manual", headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" }, signal: AbortSignal.timeout(6000) });
  try {
    let response = await request("HEAD");
    if (response.status === 405 || response.status === 501) response = await request("GET");
    await response.body?.cancel().catch(() => undefined);
    return { url, status: response.status };
  } catch (error) {
    return { url, status: null, error: error instanceof Error ? error.message : "unreachable" };
  }
}

async function probeAll(urls: string[], concurrency = 5) {
  const queue = [...urls];
  const results: Awaited<ReturnType<typeof probe>>[] = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) results.push(await probe(next));
    }),
  );
  return results;
}

async function screenshot(page: Page): Promise<string | undefined> {
  try {
    const data = await withTimeout(page.screenshot({ type: "jpeg", quality: 55, encoding: "base64" }), 8000, "screenshot");
    return `data:image/jpeg;base64,${data}`;
  } catch {
    return undefined;
  }
}

const unique = (items: string[]) => [...new Set(items)];

/** Roda o teste completo. Lança erro só se o navegador nem abrir; problemas do app viram verificações. */
export async function runCheck(target: URL, options: CheckOptions): Promise<CheckRun> {
  const started = Date.now();
  const deadline = started + options.deadlineMs;
  const remaining = () => deadline - Date.now();
  const origin = target.origin;

  const browser = await launchBrowser();
  const pages: VisitedPage[] = [];
  const screenshots: CheckScreenshots = {};
  const logs: PageLog[] = [];
  let facts: PageFacts | null = null;
  let finalUrl = target.href;
  let startStatus: number | null = null;
  let startLoadMs: number | null = null;
  let startError: string | undefined;
  let mobileOverflow: boolean | null = null;
  let linkResults: Awaited<ReturnType<typeof probeAll>> = [];

  try {
    // 1. a página colada, no desktop
    const desktop = await preparePage(browser, origin, false);
    logs.push(desktop.log);
    try {
      const opened = await open(desktop.page, target.href, Math.min(20000, remaining()));
      startStatus = opened.status;
      startLoadMs = opened.loadMs;
      finalUrl = desktop.page.url();
    } catch (error) {
      startError = error instanceof Error ? clip(error.message) : "The page didn't load.";
    }
    if (!startError) {
      // a página carregou: se a leitura falhar (a página navegou no meio, por exemplo), segue sem os detalhes
      facts = await withTimeout(readFacts(desktop.page), 5000, "read page").catch(() => null);
      screenshots.desktop = await screenshot(desktop.page);
    }
    pages.push({ url: finalUrl, kind: "start", status: startStatus, loadMs: startLoadMs, jsErrors: desktop.log.jsErrors.length, notFound: facts?.notFound ?? false, error: startError });

    const base = new URL(finalUrl);
    const links = facts ? internalLinks(facts.links, base) : [];

    // 2. os links internos, por HTTP, em paralelo com o resto. Se o app redirecionou para outro
    // domínio, ele também precisa ser público (o fetch do Node não passa pelo bloqueio do navegador).
    const safeBase = base.hostname === target.hostname || (await assertPublicHost(base).then(() => true, () => false));
    const linkCheck = safeBase && links.length && remaining() > 8000 ? probeAll(links.slice(0, MAX_LINKS).map((l) => l.url)) : Promise.resolve([]);

    // 3. a mesma página no celular (cabe na tela?)
    if (!startError && remaining() > 12000) {
      const mobile = await preparePage(browser, origin, true);
      try {
        await open(mobile.page, finalUrl, Math.min(15000, remaining()));
        mobileOverflow = (await mobile.page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2")) as boolean;
        screenshots.mobile = await screenshot(mobile.page);
      } catch {
        mobileOverflow = null;
      }
      await mobile.page.close().catch(() => undefined);
    }

    // 4. a "jornada": até MAX_PAGES páginas internas no navegador, as importantes primeiro
    for (const link of links.slice(0, MAX_PAGES)) {
      if (remaining() < 9000) break;
      const visit = await preparePage(browser, origin, false);
      logs.push(visit.log);
      const entry: VisitedPage = { url: link.url, kind: "linked", status: null, loadMs: null, jsErrors: 0, notFound: false };
      try {
        const opened = await open(visit.page, link.url, Math.min(12000, remaining() - 4000));
        entry.status = opened.status;
        entry.loadMs = opened.loadMs;
        entry.notFound = (await withTimeout(readFacts(visit.page), 5000, "read page").catch(() => null))?.notFound ?? false;
      } catch (error) {
        entry.error = error instanceof Error ? clip(error.message) : "The page didn't load.";
      }
      entry.jsErrors = visit.log.jsErrors.length;
      pages.push(entry);
      await visit.page.close().catch(() => undefined);
    }

    linkResults = await withTimeout(linkCheck, Math.max(1000, remaining()), "link check").catch(() => []);
  } finally {
    await browser.close().catch(() => undefined);
  }

  const result = buildResult({ target, finalUrl, facts, pages, logs, startStatus, startLoadMs, startError, mobileOverflow, linkResults, durationMs: Date.now() - started, locale: options.locale });
  return { result, screenshots };
}

interface BuildInput {
  target: URL;
  finalUrl: string;
  facts: PageFacts | null;
  pages: VisitedPage[];
  logs: PageLog[];
  startStatus: number | null;
  startLoadMs: number | null;
  startError?: string;
  mobileOverflow: boolean | null;
  linkResults: { url: string; status: number | null; error?: string }[];
  durationMs: number;
  locale?: Locale;
}

/** Transforma o que foi observado nas verificações do relatório. Exportada para os testes e o script de lote. */
export function buildResult(input: BuildInput): CheckResult {
  const { facts, pages, logs, startStatus, startLoadMs, startError, mobileOverflow, linkResults } = input;
  const T = CHECK_TEXT[input.locale ?? "en"];
  const L = T.labels;
  const checks: CheckItem[] = [];
  const loaded = !startError && startStatus !== null && startStatus < 400;

  checks.push(
    loaded
      ? { id: "loads", label: L.loads, verdict: facts?.notFound ? "fail" : "pass", detail: facts?.notFound ? T.notFoundScreen : T.responded(startStatus) }
      : { id: "loads", label: L.loads, verdict: "fail", detail: startError ? T.didntLoad(startError) : T.serverStatus(startStatus) },
  );

  const finalProtocol = (() => {
    try {
      return new URL(input.finalUrl).protocol;
    } catch {
      return input.target.protocol;
    }
  })();
  const insecure = unique(logs.flatMap((log) => log.insecure)).map(shortUrl);
  checks.push(
    finalProtocol !== "https:"
      ? { id: "https", label: L.https, verdict: "fail", detail: T.plainHttp }
      : insecure.length
        ? { id: "https", label: L.https, verdict: "warn", detail: T.insecure(insecure.length), items: insecure.slice(0, MAX_ITEMS) }
        : { id: "https", label: L.https, verdict: "pass", detail: T.httpsOk },
  );

  if (!loaded) {
    // sem a primeira página, o resto não diz nada
    for (const id of ["js_errors", "console", "network", "links", "pages", "mobile", "speed", "preview"] as const) {
      checks.push({ id, label: L[id], verdict: "skip", detail: T.skippedNoLoad });
    }
    return finish(input, checks);
  }

  const jsErrors = unique(logs.flatMap((log) => log.jsErrors));
  checks.push(
    jsErrors.length
      ? { id: "js_errors", label: L.js_errors, verdict: "fail", detail: T.jsFail(jsErrors.length), items: jsErrors.slice(0, MAX_ITEMS) }
      : { id: "js_errors", label: L.js_errors, verdict: "pass", detail: T.jsOk },
  );

  const consoleErrors = unique(logs.flatMap((log) => log.consoleErrors));
  checks.push(
    consoleErrors.length
      ? { id: "console", label: L.console, verdict: "warn", detail: T.consoleWarn(consoleErrors.length), items: consoleErrors.slice(0, MAX_ITEMS) }
      : { id: "console", label: L.console, verdict: "pass", detail: T.consoleOk },
  );

  const failed = logs.flatMap((log) => log.failed);
  const serious = failed.filter((f) => f.sameOrigin || f.server);
  const failedItems = unique(failed.map((f) => `${f.reason} · ${shortUrl(f.url)}`));
  checks.push(
    serious.length
      ? { id: "network", label: L.network, verdict: "fail", detail: T.networkFail(unique(serious.map((f) => f.url)).length), items: failedItems.slice(0, MAX_ITEMS) }
      : failed.length
        ? { id: "network", label: L.network, verdict: "warn", detail: T.networkWarn(unique(failed.map((f) => f.url)).length), items: failedItems.slice(0, MAX_ITEMS) }
        : { id: "network", label: L.network, verdict: "pass", detail: T.networkOk },
  );

  const broken = linkResults.filter((l) => l.status === null || l.status >= 400);
  checks.push(
    !linkResults.length
      ? { id: "links", label: L.links, verdict: "skip", detail: T.noLinks }
      : broken.length
        ? {
            id: "links",
            label: L.links,
            verdict: "fail",
            detail: T.linksFail(broken.length, linkResults.length),
            items: broken.slice(0, MAX_ITEMS).map((l) => `${l.status ? `HTTP ${l.status}` : T.unreachable} · ${shortUrl(l.url)}`),
          }
        : { id: "links", label: L.links, verdict: "pass", detail: T.linksOk(linkResults.length) },
  );

  const linked = pages.filter((p) => p.kind === "linked");
  const badPages = linked.filter((p) => p.error || (p.status !== null && p.status >= 400) || p.notFound || p.jsErrors > 0);
  checks.push(
    !linked.length
      ? { id: "pages", label: L.pages, verdict: "skip", detail: T.noPages }
      : badPages.length
        ? {
            id: "pages",
            label: L.pages,
            verdict: "fail",
            detail: T.pagesFail(badPages.length, linked.length),
            items: badPages.map((p) => `${p.error ? T.pageDidntLoad : p.notFound ? T.pageNotFound : p.status !== null && p.status >= 400 ? `HTTP ${p.status}` : T.pageJsErrors(p.jsErrors)} · ${shortUrl(p.url)}`),
          }
        : { id: "pages", label: L.pages, verdict: "pass", detail: T.pagesOk(linked.length) },
  );

  checks.push(
    mobileOverflow === null
      ? { id: "mobile", label: L.mobile, verdict: "skip", detail: T.mobileSkip }
      : !facts?.viewport
        ? { id: "mobile", label: L.mobile, verdict: "warn", detail: T.noViewport }
        : mobileOverflow
          ? { id: "mobile", label: L.mobile, verdict: "warn", detail: T.overflow }
          : { id: "mobile", label: L.mobile, verdict: "pass", detail: T.mobileOk },
  );

  const seconds = startLoadMs !== null ? `${(startLoadMs / 1000).toFixed(1)} s` : T.unknown;
  checks.push(
    startLoadMs !== null && startLoadMs > SLOW_MS
      ? { id: "speed", label: L.speed, verdict: "warn", detail: T.slow(seconds) }
      : { id: "speed", label: L.speed, verdict: "pass", detail: T.fast(seconds) },
  );

  const missing = [!facts?.title && T.missing.title, !facts?.description && T.missing.description, !facts?.ogImage && T.missing.image].filter(Boolean) as string[];
  checks.push(
    missing.length
      ? { id: "preview", label: L.preview, verdict: "warn", detail: T.previewWarn(missing.join(", ")) }
      : { id: "preview", label: L.preview, verdict: "pass", detail: T.previewOk },
  );

  return finish(input, checks);
}

function finish(input: BuildInput, checks: CheckItem[]): CheckResult {
  const count = (verdict: CheckItem["verdict"]) => checks.filter((c) => c.verdict === verdict).length;
  return {
    finalUrl: input.finalUrl,
    summary: { pass: count("pass"), warn: count("warn"), fail: count("fail") },
    checks,
    pages: input.pages,
    meta: { title: input.facts?.title ?? null, description: input.facts?.description ?? null, durationMs: input.durationMs },
  };
}
