import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 py-24 text-center">
        <h1 className="font-display text-[34px] font-medium tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-ink-muted">{t("body")}</p>
        <Link href="/dashboard" className={buttonClasses("secondary", "md", "mt-8")}>
          {t("cta")}
        </Link>
      </main>
    </>
  );
}
