import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { detectLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Idioma da requisição, sem prefixo na URL:
 *   1. cookie gravado pelo seletor EN | PT | ES (escolha manual, vale um ano);
 *   2. senão, o idioma do navegador (Accept-Language): quem chega com o celular
 *      em pt-BR cai no site em português, sem procurar o seletor;
 *   3. senão, inglês.
 *
 * A detecção fica aqui, e não num proxy, porque não há prefixo de idioma na URL:
 * não há para onde redirecionar, só o que renderizar. O cookie continua vencendo,
 * então a escolha manual nunca é desfeita pelo navegador.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : detectLocale((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "America/Sao_Paulo",
  };
});
