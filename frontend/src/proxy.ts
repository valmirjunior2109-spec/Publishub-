import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";
import { LOCALE_HEADER, splitLocalePath } from "@/i18n/paths";

/**
 * /pt/..., /es/..., /fr/... (um prefixo por idioma, ver i18n/paths.ts): a mesma página, no idioma do prefixo.
 *
 * Não há pastas por idioma. O proxy reescreve /pt/planos para /planos por dentro
 * (a barra de endereço continua /pt/planos) e diz ao i18n/request.ts qual idioma
 * renderizar. Também grava o cookie do seletor: quem chegou pelo Google em /pt
 * continua em português ao clicar num link sem prefixo.
 */
export function proxy(request: NextRequest) {
  const { locale, path } = splitLocalePath(request.nextUrl.pathname);
  if (!locale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = path;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  const response = NextResponse.rewrite(url, { request: { headers } });
  // Só quando a pessoa abre a página. O site pré-carrega em segundo plano os links
  // que aparecem na tela: se esses pré-carregamentos gravassem o cookie, um deles,
  // chegando atrasado, desfazia a troca de idioma que a pessoa acabou de fazer.
  if (!request.headers.has("next-router-prefetch")) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

export const config = {
  // escrito por extenso: o Next lê o matcher sem executar código (precisa bater com LOCALE_PREFIX)
  matcher: ["/pt", "/pt/:path*", "/es", "/es/:path*", "/fr", "/fr/:path*", "/de", "/de/:path*", "/it", "/it/:path*", "/hi", "/hi/:path*", "/id", "/id/:path*", "/tr", "/tr/:path*", "/ja", "/ja/:path*", "/ko", "/ko/:path*"],
};
