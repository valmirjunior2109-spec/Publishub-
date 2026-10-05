import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const locale = await getLocale();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 py-24 text-center">
        <h1 className="font-display font-extrabold text-[39px] tracking-[-0.045em]">{t("title")}</h1>
        <p className="mt-3 text-ink-muted">{t("body")}</p>
        {/* o início: quem chega de um link quebrado quase nunca tem conta, e quem tem cai no painel por lá */}
        <Link href={localePath(locale, "/")} className={buttonClasses("secondary", "md", "mt-8")}>
          {t("cta")}
        </Link>
      </main>
    </>
  );
}
