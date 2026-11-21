import { USER_AGENT } from "./scan";
import { assertPublicHost } from "./url";

/**
 * As páginas públicas onde lojas Shopify costumam publicar o e-mail de contato.
 * Ordem = prioridade de "onde apareceu primeiro" (a página de contato vence a de privacidade).
 */
export const CONTACT_PATHS = ["/policies/contact-information", "/pages/contact", "/policies/privacy-policy", "/policies/terms-of-service", "/policies/refund-policy"];

/** Caminhos que pedem login (ou a senha de loja fechada): nunca seguimos para eles. */
const LOGIN_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:account|password|admin|checkouts?|login|customer_authentication)(?:\/|$|\?)/i;

const REQUEST_TIMEOUT_MS = 5_000;
const MIN_GAP_MS = 1_000;
const MAX_REDIRECTS = 3;
const MAX_HTML_CHARS = 1_500_000;

/** Último pedido por domínio, neste processo: no máximo 1 pedido por segundo para cada loja. */
const lastRequestAt = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** O domínio "da loja" de um host: loja.com para www.loja.com e us.checkout.loja.com; loja.co.uk para shop.loja.co.uk. */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const [second, tld] = labels.slice(-2);
  // loja.myshopify.com é uma loja; outra.myshopify.com é outra
  const sharedHost = second === "myshopify" && tld === "com";
  const keep = sharedHost || (tld.length === 2 && ["co", "com", "net", "org", "gov", "ac", "edu"].includes(second)) ? 3 : 2;
  return labels.slice(-keep).join(".");
}

/** Mesmo site: o mesmo domínio registrável (www, subdomínios de checkout e afins contam). */
export function sameSite(a: string, b: string): boolean {
  return registrableDomain(a) === registrableDomain(b);
}

async function politeTurn(host: string): Promise<void> {
  const key = registrableDomain(host);
  const wait = (lastRequestAt.get(key) ?? 0) + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(key, Date.now());
}

interface GetResult {
  page: { url: string; html: string } | null;
  /** A origem onde a loja respondeu de fato (depois de www e afins), para os próximos pedidos irem direto. */
  finalOrigin: string | null;
  /** A loja pediu para pararmos (429/503): não pedimos mais nada a ela neste scan. */
  stop: boolean;
}

/**
 * Um GET educado: user-agent do scanner, 5 s de limite, redirecionamentos só dentro do mesmo site
 * (com a checagem de IP público a cada salto) e nada que peça login.
 */
async function politeGet(start: URL): Promise<GetResult> {
  let url = start;
  const none = (stop = false): GetResult => ({ page: null, finalOrigin: url.origin, stop });
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (LOGIN_PATH.test(url.pathname)) return none();
    await assertPublicHost(url);
    await politeTurn(url.hostname);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) return none();
      const next = new URL(location, url);
      if ((next.protocol !== "https:" && next.protocol !== "http:") || !sameSite(next.hostname, start.hostname)) return none();
      url = next;
      continue;
    }
    if (response.status === 429 || response.status === 503) {
      await response.body?.cancel().catch(() => undefined);
      return none(true);
    }
    // 401/403: atrás de login; 404 e afins: a loja não tem essa página
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return none();
    }
    const type = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) {
      await response.body?.cancel().catch(() => undefined);
      return none();
    }
    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    // loja fechada com senha: a Shopify responde a página de senha no lugar
    if (/<form[^>]+action=["'][^"']*\/password/i.test(html)) return none();
    return { page: { url: url.toString(), html }, finalOrigin: url.origin, stop: false };
  }
  return none();
}

/**
 * Busca as páginas de política e de contato de uma loja, no máximo uma por segundo, dentro do prazo.
 * Falhas de uma página não param as outras; um 429/503 para tudo. O resultado vem na ordem de CONTACT_PATHS.
 */
export async function fetchContactPages(origin: string, options: { deadlineMs: number }): Promise<{ url: string; html: string }[]> {
  const started = Date.now();
  const pages: { url: string; html: string }[] = [];
  let base = origin;
  for (const path of CONTACT_PATHS) {
    // sem tempo para mais um pedido completo (espera de 1 s + 5 s de limite): para aqui
    if (Date.now() - started + MIN_GAP_MS + REQUEST_TIMEOUT_MS > options.deadlineMs) break;
    try {
      const result = await politeGet(new URL(path, base));
      if (result.page) pages.push(result.page);
      if (result.stop) break;
      // loja.com → www.loja.com: as próximas páginas vão direto para o endereço final
      if (result.finalOrigin && sameSite(new URL(result.finalOrigin).hostname, new URL(origin).hostname)) base = result.finalOrigin;
    } catch {
      // timeout, DNS, rede: segue para a próxima página
    }
  }
  return pages;
}
