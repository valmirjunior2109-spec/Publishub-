import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";
import { LOCALE_HEADER, splitLocalePath } from "@/i18n/paths";

/**
 * /pt/... e /es/...: a mesma página, no idioma do prefixo.
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
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}

export const config = {
  matcher: ["/pt", "/pt/:path*", "/es", "/es/:path*"],
};
