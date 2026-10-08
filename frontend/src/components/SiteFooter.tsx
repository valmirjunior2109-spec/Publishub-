import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { localePath } from "@/i18n/paths";
import { guidePath, guidesIn } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";

/**
 * O rodapé das páginas públicas. Renderizado no servidor, com os links no HTML:
 * o cabeçalho só mostra o menu depois de saber se há sessão, então é aqui que
 * o Google (e quem chega sem JavaScript) acha o caminho para os planos, o teste
 * e cada guia, de qualquer página do site.
 */
export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getTranslations("Landing");
  const tCommon = await getTranslations("Common");
  const tGuides = await getTranslations("Guides");
  const guides = guidesIn(locale);
  const link = "text-ink-muted transition-colors hover:text-ink hover:no-underline";
  const heading = "text-[13px] font-medium text-ink";
  const list = "mt-4 flex flex-col gap-2.5 text-[14px]";

  return (
    <footer className="border-t border-line bg-paper">
      {/* no celular: a marca em cima e os links em duas colunas */}
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-16 lg:grid-cols-[1.4fr_1fr_1.5fr_1fr_1fr] lg:py-20">
        <div className="col-span-2 lg:col-span-1">
          <Link href={localePath(locale, "/")} className="inline-block hover:no-underline">
            <Logo size="sm" label={tCommon("brand")} />
          </Link>
          <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-ink-muted">{t("footer")}</p>
        </div>
        <nav aria-label={t("footerCols.product")}>
          <p className={heading}>{t("footerCols.product")}</p>
          <ul className={list}>
            <li>
              <Link href={localePath(locale, "/experimentar")} className={link}>
                {t("footerCols.try")}
              </Link>
            </li>
            <li>
              <Link href={localePath(locale, "/planos")} className={link}>
                {tCommon("plans")}
              </Link>
            </li>
          </ul>
        </nav>
        {guides.length > 0 && (
          <nav aria-label={tCommon("guides")} className="col-span-2 sm:col-span-1">
            <p className={heading}>{tCommon("guides")}</p>
            <ul className={list}>
              {guides.map((guide) => (
                <li key={guide.slug}>
                  <Link href={localePath(locale, guidePath(guide.slug))} className={link}>
                    {guide.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={localePath(locale, "/guias")} className={link}>
                  {tGuides("all")}
                </Link>
              </li>
            </ul>
          </nav>
        )}
        <nav aria-label={t("footerCols.company")}>
          <p className={heading}>{t("footerCols.company")}</p>
          <ul className={list}>
            <li>
              <Link href={localePath(locale, "/partners")} className={link}>
                {t("partners.cta")}
              </Link>
            </li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={link}>
                {tCommon("support")}
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label={t("footerCols.legal")}>
          <p className={heading}>{t("footerCols.legal")}</p>
          <ul className={list}>
            <li>
              <Link href={localePath(locale, "/privacidade")} className={link}>
                {tCommon("privacy")}
              </Link>
            </li>
            <li>
              <Link href={localePath(locale, "/termos")} className={link}>
                {tCommon("terms")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-6 font-mono text-[12px] text-ink-muted">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
