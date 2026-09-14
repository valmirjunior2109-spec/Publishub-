import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Idioma da requisição, sem prefixo na URL:
 *   1. cookie gravado pelo seletor PT | EN | ES (escolha manual);
 *   2. senão, português — o produto é brasileiro, e o Accept-Language engana
 *      (muito navegador no Brasil está configurado em inglês).
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "America/Sao_Paulo",
  };
});
