import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
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
  const sections = t.raw("sections") as Section[];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[760px] px-4 pb-12 pt-5 sm:px-6 lg:pt-8">
        <p className="eyebrow">{t("updated")}</p>
        <h1 className="mt-3 t-page">{t("title")}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">{t("intro")}</p>

        <ol className="mt-8 flex flex-col">
          {sections.map((section, index) => (
            <li key={section.title} className="grid gap-2 border-t border-line py-5 last:border-b sm:grid-cols-[auto_1fr] sm:gap-5">
              <span className="font-display text-[13px] tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="font-display text-[17px] font-medium leading-snug tracking-tight">{section.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{section.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-[13px] text-ink-muted">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
