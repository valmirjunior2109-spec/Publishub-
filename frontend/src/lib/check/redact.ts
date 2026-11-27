/**
 * Limpa o que sai do relatório do teste grátis antes de aparecer na tela, ir para a área de
 * transferência ou para um post: valores de query string, e-mails, JWTs, tokens Bearer, ids e
 * sequências longas com cara de chave. O teste só abre páginas públicas, mas uma URL que falhou ou uma
 * mensagem de erro pode carregar um token ou um e-mail, e isso nunca deve ir para o post de ninguém.
 */

const REDACTED = "[redacted]";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const BEARER = /\b(bearer|basic|token)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const KEY_VALUE = /\b(api[_-]?key|apikey|access[_-]?token|authorization|password|passwd|secret|session|cookie|token|signature)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** 24 ou mais caracteres seguidos de letras e números misturados: chave, hash ou token. */
const LONG_SECRET = /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g;
/** A query string de uma URL: os nomes ficam, os valores saem. */
const QUERY = /\?([^\s#)"'<>]*)/g;

function redactQuery(_match: string, query: string): string {
  if (!query) return "?";
  const parts = query.split("&").map((part) => {
    const [key] = part.split("=");
    return key ? `${key}=…` : "…";
  });
  return `?${parts.join("&")}`;
}

/** Uma linha de evidência (mensagem de erro, URL, item do relatório), sem dados sensíveis. */
export function redact(text: string): string {
  return text
    .replace(QUERY, redactQuery)
    .replace(JWT, REDACTED)
    .replace(BEARER, (_m, kind: string) => `${kind} ${REDACTED}`)
    .replace(KEY_VALUE, (_m, key: string, sep: string) => `${key}${sep}${REDACTED}`)
    .replace(EMAIL, "[email]")
    .replace(UUID, ":id")
    .replace(LONG_SECRET, REDACTED);
}

/** Só o caminho de uma URL (ou de um "host/caminho"), sem host, query nem fragmento, já limpo. */
export function routeOf(raw: string): string {
  const text = raw.trim();
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return redact(url.pathname || "/");
  } catch {
    return redact(text);
  }
}

/** O host de uma URL ("meuapp.vercel.app"), ou null. */
export function hostOf(raw: string): string | null {
  try {
    return new URL(raw).host || null;
  } catch {
    return null;
  }
}

/** A URL testada, para quem fez o teste: origem e caminho, sem query nem fragmento. */
export function displayUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return redact(`${url.origin}${url.pathname === "/" ? "" : url.pathname}`);
  } catch {
    return redact(raw);
  }
}
