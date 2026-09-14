import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Idioma da requisição, sem prefixo na URL:
 *   1. cookie gravado pelo seletor EN | PT | ES (escolha manual, vale um ano);
 *   2. senão, inglês — todo mundo entra em inglês e troca se quiser.
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
