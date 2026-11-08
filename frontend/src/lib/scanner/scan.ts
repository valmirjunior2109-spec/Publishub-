import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Browser, HTTPRequest, Page } from "puppeteer-core";
import { AXE_TAGS } from "@/lib/site";
import { launchBrowser } from "./browser";
import { normalizeImpact, type Impact } from "./rules";
import { riskScore, type RuleTotal } from "./score";
import { isBlockedRequestHost } from "./url";

/**
 * A varredura em si, sem banco: abre a loja num Chromium, descobre as páginas, roda o
 * axe-core em cada uma e devolve as violações. Quem chama (a rota na Vercel, o worker
 * ou o script de linha de comando) decide onde guardar o resultado.
 */

export const USER_AGENT = "PublishubScanner/1.0 (+https://getpublishub.com/scanner)";
const DESKTOP_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Safari/537.36 ${USER_AGENT}`;

/** Quantos nós guardamos por regra e por página: o total entra na contagem, os exemplos no relatório. */
const NODES_PER_RULE_PER_PAGE = 5;
const SNIPPET_MAX = 400;

export type PageKind = "home" | "collection" | "product" | "cart";

export interface ScannedIssue {
  ruleId: string;
  impact: Impact;
  help: string;
  helpUrl: string;
  selector: string;
  htmlSnippet: string;
  /** Quantos elementos desta regra existem nesta página (só alguns viram exemplo). */
  occurrences: number;
}

export interface ScannedPage {
  url: string;
  kind: PageKind;
  status: "done" | "failed" | "skipped";
  error?: string;
  issues: ScannedIssue[];
}

export interface ScanResult {
  isShopify: boolean;
  pages: ScannedPage[];
  riskScore: number;
  rules: RuleTotal[];
}

export interface ScanOptions {
  /** Prazo total, em ms: o que não couber vira "skipped". */
  deadlineMs: number;
  /** Por página: carregamento + axe. */
  pageTimeoutMs?: number;
  /** Chamado ao começar e ao terminar cada página (para gravar o progresso). */
  onPage?: (page: ScannedPage, phase: "start" | "end") => Promise<void> | void;
}

let axeSource: string | null = null;
function axeScript(): string {
  if (!axeSource) {
    const require = createRequire(import.meta.url);
    axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  }
  return axeSource;
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

/** Imagens, vídeos e fontes não mudam o resultado do axe e deixam a página lenta: ficam de fora. */
const SKIPPED_TYPES = new Set(["image", "media", "font"]);

async function preparePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(DESKTOP_UA);
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on("request", (request: HTTPRequest) => {
    let host = "";
    try {
      host = new URL(request.url()).hostname;
    } catch {
      // data: e blob: não têm host e não saem para a rede
    }
    if (host && isBlockedRequestHost(host)) return void request.abort("accessdenied").catch(() => undefined);
    if (SKIPPED_TYPES.has(request.resourceType())) return void request.abort("blockedbyclient").catch(() => undefined);
    return void request.continue().catch(() => undefined);
  });
  return page;
}

async function open(page: Page, url: string, timeoutMs: number): Promise<number | null> {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  // o tema termina de montar com JavaScript: um respiro curto, sem esperar a rede inteira
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 }).catch(() => undefined);
  return response ? response.status() : null;
}

async function detectShopify(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const w = window as unknown as { Shopify?: unknown };
    if (w.Shopify) return true;
    if (document.querySelector('meta[name="shopify-checkout-api-token"], meta[name="shopify-digital-wallet"]')) return true;
    const assets = Array.from(document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>("link[href], script[src]"));
    return assets.some((el) => /\/cdn\/shop\/|cdn\.shopify\.com/.test("href" in el ? el.href : el.src));
  });
}

async function firstProductFromPage(page: Page, origin: string): Promise<string | null> {
  return page.evaluate((base) => {
    for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/products/"]'))) {
      try {
        const url = new URL(a.href, base);
        if (url.origin === base && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:collections\/[^/]+\/)?products\/[^/?#]+/i.test(url.pathname)) {
          return `${url.origin}${url.pathname}`;
        }
      } catch {
        // href inválido: segue para o próximo
      }
    }
    return null;
  }, origin);
}

async function firstProductFromJson(origin: string): Promise<string | null> {
  try {
    const response = await fetch(`${origin}/products.json?limit=1`, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(6000), redirect: "follow" });
    if (!response.ok) return null;
    const data = (await response.json()) as { products?: { handle?: string }[] };
    const handle = data.products?.[0]?.handle;
    return handle ? `${origin}/products/${encodeURIComponent(handle)}` : null;
  } catch {
    return null;
  }
}

interface AxeNode {
  target: unknown[];
  html: string;
}
interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

async function runAxe(page: Page, timeoutMs: number): Promise<ScannedIssue[]> {
  await page.evaluate(axeScript());
  const violations = await withTimeout(
    page.evaluate(async (tags: string[]) => {
      const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: unknown[] }> } }).axe;
      const result = await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      return result.violations;
    }, [...AXE_TAGS]) as Promise<AxeViolation[]>,
    timeoutMs,
    "Accessibility check",
  );

  const issues: ScannedIssue[] = [];
  for (const violation of violations) {
    const impact = normalizeImpact(violation.impact);
    for (const node of violation.nodes.slice(0, NODES_PER_RULE_PER_PAGE)) {
      issues.push({
        ruleId: violation.id,
        impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        selector: node.target.map((part) => (Array.isArray(part) ? part.join(" ") : String(part))).join(" "),
        htmlSnippet: node.html.length > SNIPPET_MAX ? `${node.html.slice(0, SNIPPET_MAX)}…` : node.html,
        occurrences: violation.nodes.length,
      });
    }
  }
  return issues;
}

/** Soma por regra, contando cada página uma vez (cada nó de exemplo repete o total da página). */
export function totalsByRule(pages: Pick<ScannedPage, "url" | "issues">[]): RuleTotal[] {
  const totals = new Map<string, RuleTotal>();
  for (const page of pages) {
    const seen = new Set<string>();
    for (const issue of page.issues) {
      if (seen.has(issue.ruleId)) continue;
      seen.add(issue.ruleId);
      const current = totals.get(issue.ruleId);
      if (current) current.occurrences += issue.occurrences;
      else totals.set(issue.ruleId, { ruleId: issue.ruleId, help: issue.help, impact: issue.impact, occurrences: issue.occurrences });
    }
  }
  return [...totals.values()];
}

export async function scanStore(storeUrl: URL, options: ScanOptions): Promise<ScanResult> {
  const started = Date.now();
  const pageTimeout = options.pageTimeoutMs ?? 20_000;
  const remaining = () => options.deadlineMs - (Date.now() - started);
  let origin = storeUrl.origin;
  const pages: ScannedPage[] = [];
  let isShopify = false;

  const browser = await launchBrowser();
  try {
    const page = await preparePage(browser);

    const scanOne = async (url: string, kind: PageKind, before?: () => Promise<void>): Promise<ScannedPage> => {
      const result: ScannedPage = { url, kind, status: "done", issues: [] };
      if (remaining() < 8_000) {
        result.status = "skipped";
        result.error = "Skipped to stay within the time limit.";
        pages.push(result);
        return result;
      }
      await options.onPage?.(result, "start");
      try {
        const budget = Math.min(pageTimeout, remaining() - 2_000);
        const status = await withTimeout(open(page, url, budget), budget + 1_000, "Page load");
        if (status !== null && status >= 400) throw new Error(`The page returned HTTP ${status}.`);
        await before?.();
        result.issues = await runAxe(page, Math.max(5_000, Math.min(15_000, remaining() - 1_000)));
      } catch (error) {
        result.status = "failed";
        result.error = error instanceof Error ? error.message.slice(0, 300) : "The page could not be scanned.";
      }
      pages.push(result);
      await options.onPage?.(result, "end");
      return result;
    };

    // 1. a home: é nela que descobrimos se é Shopify
    await scanOne(`${origin}/`, "home", async () => {
      // loja.com costuma redirecionar para www.loja.com: as próximas páginas seguem o endereço final
      const landed = new URL(page.url());
      if ((landed.protocol === "https:" || landed.protocol === "http:") && !isBlockedRequestHost(landed.hostname)) origin = landed.origin;
      isShopify = await detectShopify(page).catch(() => false);
    });

    if (isShopify) {
      // 2. uma coleção; 3. um produto achado nela (ou no /products.json); 4. o carrinho
      let productUrl: string | null = null;
      await scanOne(`${origin}/collections/all`, "collection", async () => {
        productUrl = await firstProductFromPage(page, origin).catch(() => null);
      });
      productUrl ??= await firstProductFromJson(origin);
      if (productUrl) await scanOne(productUrl, "product");
      await scanOne(`${origin}/cart`, "cart");
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const rules = totalsByRule(pages.filter((p) => p.status === "done"));
  return { isShopify, pages, riskScore: riskScore(rules), rules };
}
