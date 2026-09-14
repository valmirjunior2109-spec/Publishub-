import type messages from "../messages/en.json";
import type { AppLocale } from "./i18n/config";

/* Deixa t("Analysis.loop.title") tipado: chave errada vira erro de compilação. */
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
