import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * A URL que o lojista cola vira a origem da loja (https://loja.com), e só se for um
 * endereço público: nada de localhost, IP de rede interna ou porta fora do padrão.
 * É a proteção contra SSRF: o scanner abre um navegador no nosso servidor, então
 * não pode ser apontado para dentro da nossa rede.
 */

export class InvalidUrlError extends Error {}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".intranet", ".corp"];

export function normalizeStoreUrl(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim()) throw new InvalidUrlError("Enter your store's URL.");
  let text = raw.trim();
  if (text.length > 2048) throw new InvalidUrlError("That URL is too long.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new InvalidUrlError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new InvalidUrlError("Only http and https URLs can be scanned.");
  if (url.username || url.password) throw new InvalidUrlError("Remove the username or password from the URL.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new InvalidUrlError("Custom ports can't be scanned.");

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new InvalidUrlError("That address can't be scanned.");
  }
  // lojas têm domínio: endereço IP direto, público ou não, fica de fora
  if (isIP(host.replace(/^\[|\]$/g, ""))) throw new InvalidUrlError("Enter the store's domain name, not an IP address.");
  if (!host.includes(".")) throw new InvalidUrlError("Enter the full domain, for example yourstore.com.");

  return new URL(`${url.protocol}//${host}`);
}

/** O endereço é de rede privada, loopback, link-local ou reservado? */
export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").toLowerCase();
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (version === 6) {
    if (ip === "::" || ip === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(ip) || ip.startsWith("64:ff9b:") || ip.startsWith("2001:db8");
  }
  return true; // não é um IP: na dúvida, bloqueia
}

/** Resolve o domínio e recusa se qualquer endereço dele cair numa rede interna. */
export async function assertPublicHost(url: URL): Promise<void> {
  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new InvalidUrlError("We couldn't find that website. Check the address and try again.");
  }
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new InvalidUrlError("That address can't be scanned.");
  }
}

/** Para o navegador: o pedido vai para um host que nunca deveria ser acessado? */
export function isBlockedRequestHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  return isIP(host) ? isPrivateAddress(host) : false;
}
