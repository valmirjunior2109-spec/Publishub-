import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cardPath, clock, fetchShared, retention, sharePath } from "@/lib/share";

type Props = { params: Promise<{ token: string }> };

/**
 * O resultado que um criador compartilhou: "meu Reel perdia gente no 0:04".
 *
 * Quem abre é quase sempre outro criador, vindo dos Stories ou do WhatsApp. A
 * página mostra o resultado e leva ao teste grátis com o próprio vídeo. Fora do
 * Google (é conteúdo de uma pessoa, não página do site).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await fetchShared(token);
  if (!result) return { robots: { index: false, follow: false } };
  const t = await getTranslations("Share.page");
  const locale = await getLocale();
  const title = t("metaTitle", { at: clock(result.drop.at_seconds) });
  const description = t("metaDescription");
  const image = cardPath(token, "og", locale);
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: sharePath(token) },
    openGraph: { type: "article", title, description, url: sharePath(token), images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedResultPage({ params }: Props) {
  const { token } = await params;
  const result = await fetchShared(token);
  if (!result) notFound();

  const t = await getTranslations("Share.page");
  const locale = await getLocale();
  const at = clock(result.drop.at_seconds);
  const numbers = retention(result);

  return (
    <>
      <SiteHeader />
      <main className="container-page pb-24 pt-12 lg:pt-16">
        <article className="mx-auto max-w-[680px]">
          <p className="chip">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
            {t("kicker")}
          </p>

          <h1 className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="font-serif text-[88px] font-medium leading-none tracking-[-0.04em] text-refuted tabular-nums sm:text-[120px]">{at}</span>
            <span className="t-h2 text-balance">{t("leaves")}</span>
          </h1>
          {numbers && <p className="mt-4 font-mono text-[14px] text-ink-muted">{t("watching", { before: numbers.before, after: numbers.after, lost: numbers.lost })}</p>}
          {!numbers && <p className="mt-4 text-[14px] text-ink-muted">{t("estimated")}</p>}

          <figure className="mt-10 rounded-[28px] border border-line bg-paper-raised p-7 sm:p-9">
            <figcaption className="t-label">{t("phraseLabel", { at })}</figcaption>
            <blockquote className="mt-3 font-display text-[24px] leading-snug tracking-[-0.01em] sm:text-[28px]">“{result.phrase}”</blockquote>
          </figure>

          <section className="mt-8">
            <h2 className="t-label text-caramel-ink">{t("why")}</h2>
            <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-muted">{result.diagnosis}</p>
          </section>

          {/* o convite: o mesmo teste, com o vídeo de quem está lendo */}
          <section className="mt-12 rounded-[28px] border border-[rgba(var(--accent-rgb),0.3)] bg-accent-soft p-7 sm:p-9">
            <h2 className="font-display text-[26px] font-medium leading-tight tracking-[-0.01em] sm:text-[30px]">{t("ctaTitle")}</h2>
            <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-ink-muted">{t("ctaLead")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <TrackedLink where="shared_result" href={localePath(locale, "/try")} className={buttonClasses("primary", "md", "min-h-12 px-6")}>
                {t("cta")}
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </TrackedLink>
              <TrackedLink where="shared_result_tools" href={localePath(locale, "/tools")} className="text-[14px] font-medium underline-offset-2 hover:underline">
                {t("tools")}
              </TrackedLink>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-muted">{t("ctaNote")}</p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
