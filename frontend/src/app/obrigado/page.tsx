import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/Logo";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Destino do redirecionamento do Stripe depois do pagamento.
 * O Stripe chama esta página com ?session_id={CHECKOUT_SESSION_ID}; ainda não
 * conferimos a sessão no servidor — o acesso não é bloqueado para quem não
 * pagou. Quando for, a checagem entra aqui e no backend.
 */
export default async function ThankYouPage() {
  const t = await getTranslations("ThankYou");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 pb-24 pt-16 lg:px-16 lg:pt-24">
        <div className="mx-auto max-w-[560px]">
          <LogoMark size={40} />
          <p className="t-label mt-8">{t("eyebrow")}</p>
          <h1 className="t-display-l mt-3">{t("title")}</h1>
          <p className="t-body-l mt-6 text-ink-muted">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClasses("primary", "md")}>
              {t("cta")}
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "md")}>
              {t("secondary")}
            </Link>
          </div>
          <div className="mt-10 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
            <p>{t("receipt")}</p>
            <p className="mt-1">{t("support")}</p>
          </div>
        </div>
      </main>
    </>
  );
}
