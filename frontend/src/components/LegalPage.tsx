import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { SiteHeader } from "@/components/SiteHeader";
import { SUPPORT_EMAIL } from "@/lib/support";

interface Section {
  title: string;
  body: string;
}

/**
 * O corpo compartilhado da Privacidade e dos Termos: os dois têm a mesma forma
 * (título, data, introdução e seções numeradas) e mudam só no conteúdo.
 *
 * Ficam fora do app e sem exigir login: são documentos que alguém precisa poder
 * ler antes de criar conta.
 */
export async function LegalPage({ namespace }: { namespace: "privacy" | "terms" }) {
  const t = await getTranslations(`Legal.${namespace}`);
  const tCommon = await getTranslations("Common");
  const sections = t.raw("sections") as Section[];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[760px] px-5 pb-24 pt-10 lg:pt-16">
        <p className="eyebrow">{t("updated")}</p>
        <h1 className="mt-3 font-display text-[32px] font-medium leading-tight tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">{t("intro")}</p>

        <ol className="mt-10 flex flex-col">
          {sections.map((section, index) => (
            <li key={section.title} className="grid gap-2 border-t border-line py-6 last:border-b sm:grid-cols-[auto_1fr] sm:gap-6">
              <span className="font-display text-[13px] tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="font-display text-[19px] font-medium leading-snug tracking-tight">{section.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{section.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo size="sm" label={tCommon("brand")} />
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-ink-muted">
            <Link href={namespace === "privacy" ? "/termos" : "/privacidade"} className="hover:text-ink">
              {namespace === "privacy" ? tCommon("terms") : tCommon("privacy")}
            </Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
