import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { detectLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Idioma da requisição, sem prefixo na URL:
 *   1. cookie gravado pelo seletor (escolha manual);
 *   2. senão, o Accept-Language do navegador;
 *   3. senão, pt-BR.
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
