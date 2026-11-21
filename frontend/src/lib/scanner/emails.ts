/**
 * Os e-mails de contato que a própria loja publica (rodapé, páginas de política e de contato):
 * achar, limpar e ordenar. Funções puras, sem rede: servem ao servidor e ao /admin.
 */

export interface FoundEmail {
  email: string;
  /** A página onde o e-mail apareceu primeiro. */
  sourcePage: string;
}

/** Quantos e-mails guardamos por loja. */
export const MAX_EMAILS_PER_STORE = 3;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}/gi;

/** Domínios falsos ou técnicos: exemplos, monitoramento de erros, construtores de site e a própria Shopify. */
const BLOCKED_DOMAIN_PARTS = ["example.", "sentry", "wixpress", "domain.com", "yourdomain", "yourstore"];
const BLOCKED_DOMAIN_SUFFIXES = ["shopify.com", "myshopify.com"]; // e qualquer subdomínio deles
const BLOCKED_LOCAL_PARTS = ["noreply", "no-reply", "donotreply", "do-not-reply"];
/** "logo@2x.png" parece e-mail para a regex: a "TLD" é uma extensão de arquivo. */
const FILE_TLDS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "ico", "bmp", "tif", "tiff", "css", "js", "json", "mp4", "webm", "woff", "woff2"]);

/** Provedores de e-mail pessoais: depois do domínio da loja, antes dos outros. */
const FREE_PROVIDERS = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com"]);
/** Prefixos preferidos, nesta ordem. */
const PREFERRED_PREFIXES = ["owner", "founder", "hello", "contact", "info", "support"];

/** Minúsculas, sem "mailto:", sem parâmetros e sem pontuação nas pontas. Null se não parecer e-mail. */
export function normalizeEmail(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  try {
    value = decodeURIComponent(value);
  } catch {
    // % solto: segue como veio
  }
  value = value.replace(/^mailto:/, "").split("?")[0].replace(/^[\s<("'.,;:]+|[\s>)"'.,;:]+$/g, "");
  const match = value.match(new RegExp(`^${EMAIL_RE.source}$`, "i"));
  return match ? value : null;
}

/** Falso ou técnico: exemplo, sentry, wixpress, shopify.com, noreply, ou um nome de arquivo (logo@2x.png). */
export function isUnwantedEmail(email: string): boolean {
  const [local, domain = ""] = email.split("@");
  if (!local || !domain) return true;
  if (BLOCKED_LOCAL_PARTS.some((part) => local.includes(part))) return true;
  if (BLOCKED_DOMAIN_PARTS.some((part) => domain.includes(part))) return true;
  if (BLOCKED_DOMAIN_SUFFIXES.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`))) return true;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (FILE_TLDS.has(tld)) return true;
  if (/^\d+x$/.test(domain.split(".")[0])) return true; // @2x.algo
  return false;
}

/** O texto visível de um HTML: sem scripts, estilos e tags, com as entidades de "@" e "." decodificadas. */
function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#0*64;|&#x0*40;|&commat;/gi, "@")
    .replace(/&#0*46;|&#x0*2e;|&period;/gi, ".")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&");
}

/** Os e-mails de um HTML: dos links mailto: e do texto visível, já limpos, na ordem em que aparecem. */
export function extractEmails(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/href\s*=\s*["']?\s*mailto:([^"'\s>]+)/gi)) {
    for (const part of match[1].split(",")) {
      const email = normalizeEmail(part);
      if (email) found.push(email);
    }
  }
  for (const match of visibleText(html).matchAll(EMAIL_RE)) {
    const email = normalizeEmail(match[0]);
    if (email) found.push(email);
  }
  return [...new Set(found)].filter((email) => !isUnwantedEmail(email));
}

/** "www.loja.com" → "loja.com". */
function siteRoot(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** 0 = domínio da loja (ou subdomínio dele), 1 = gmail/outlook, 2 = outros. */
function domainTier(email: string, storeHost: string): number {
  const domain = email.split("@")[1] ?? "";
  const root = siteRoot(storeHost);
  if (domain === root || domain.endsWith(`.${root}`) || root.endsWith(`.${domain}`)) return 0;
  return FREE_PROVIDERS.has(domain) ? 1 : 2;
}

/** A posição do prefixo na lista preferida (owner, founder, hello, contact, info, support); o resto vem depois. */
function prefixRank(email: string): number {
  const head = (email.split("@")[0] ?? "").split(/[._+-]/)[0];
  const index = PREFERRED_PREFIXES.indexOf(head);
  return index === -1 ? PREFERRED_PREFIXES.length : index;
}

/** Ordena: domínio da loja primeiro, depois gmail/outlook, depois os outros; dentro de cada grupo, os prefixos preferidos. Empate: quem apareceu primeiro. */
export function rankEmails<T extends { email: string }>(items: T[], storeHost: string): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => domainTier(a.item.email, storeHost) - domainTier(b.item.email, storeHost) || prefixRank(a.item.email) - prefixRank(b.item.email) || a.index - b.index)
    .map(({ item }) => item);
}

/** Junta as páginas (na ordem dada), sem repetir e-mail, e devolve os melhores. */
export function bestEmails(pages: { url: string; html: string }[], storeHost: string, limit = MAX_EMAILS_PER_STORE): FoundEmail[] {
  const seen = new Map<string, FoundEmail>();
  for (const page of pages) {
    for (const email of extractEmails(page.html)) {
      if (!seen.has(email)) seen.set(email, { email, sourcePage: page.url });
    }
  }
  return rankEmails([...seen.values()], storeHost).slice(0, limit);
}
