import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";

export async function SiteHeader() {
  const t = await getTranslations("Common");

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-[22px] font-semibold tracking-tight text-ink">
          <Logo size={30} />
          {t("brand")}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher />
          <Link href="/nova-analise" className={buttonClasses("primary", "md")}>
            {t("newAnalysis")}
          </Link>
        </div>
      </div>
    </header>
  );
}
