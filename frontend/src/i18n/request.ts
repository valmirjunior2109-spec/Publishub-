import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { detectLocale, isLocale, LOCALE_COOKIE } from "./config";
import { LOCALE_HEADER } from "./paths";

/**
 * Idioma da requisição:
 *   1. o prefixo da URL (/pt, /es), que o proxy transforma num header: é o
 *      endereço que o Google indexa, então ele manda em tudo;
 *   2. cookie gravado pelo seletor EN | PT | ES (escolha manual, vale um ano);
 *   3. senão, o idioma do navegador (Accept-Language): quem chega com o celular
 *      em pt-BR cai no site em português, sem procurar o seletor;
 *   4. senão, inglês.
 *
 * Sem prefixo não há redirecionamento, só o que renderizar. O cookie continua
 * vencendo o navegador, então a escolha manual nunca é desfeita por ele.
 */
export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const fromUrl = requestHeaders.get(LOCALE_HEADER);
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromUrl) ? fromUrl : isLocale(cookieLocale) ? cookieLocale : detectLocale(requestHeaders.get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "America/Sao_Paulo",
  };
});
