import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { HandNote, PenCheck, PenCircle, PenUnderline, PostIt } from "@/components/hand/Pen";
import { Logo } from "@/components/Logo";
import { PricingCards } from "@/components/PricingCards";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { guidesIn } from "@/lib/guides";
import { OFFER } from "@/lib/pricing";
import { jsonLd, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";

export function generateMetadata() {
  return pageMetadata("home", "/");
}

/* A landing usa uma análise de exemplo (fixture) como material visual. */
const sample = analyses[0];
/* O bloco da previsão mostra um ciclo fechado: esta é a única fixture com previsão e número real. */
const loopSample = analyses[1];

const FRONTS = ["hook", "cut", "pacing", "broll", "caption", "structure", "cta"] as const;

/* "Gancho: o que dizer…" → título e descrição, nos três idiomas. */
function splitItem(text: string): { title: string; body: string } {
  const at = text.indexOf(":");
  return at > 0 ? { title: text.slice(0, at), body: text.slice(at + 1).trim() } : { title: text, body: "" };
}

/** O título de cada seção: a nota à mão em cima, o título grande embaixo. */
function SectionHeading({ eyebrow, title, lead, center = false }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-[760px] text-center" : "max-w-[680px]"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-[56px]">{title}</h2>
      {lead && <p className={cn("mt-5 text-[17px] leading-relaxed text-ink-muted sm:text-[19px]", center && "mx-auto max-w-[60ch]")}>{lead}</p>}
    </Reveal>
  );
}

interface Line {
  time: string;
  text: string;
  mark: "cut" | "drop" | "keep" | "";
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const c = await getTranslations("Landing.caderno");
  const tCommon = await getTranslations("Common");
  const dropTime = formatTimestamp(sample.dropAtSec);
  const benefits = t.raw("hero.benefits") as string[];
  const lines = c.raw("lines") as Line[];
  const notes = c.raw("notes") as string[];
  const lost = Math.round(sample.retention[sample.dropAtSec][1] - sample.retention[sample.dropAtSec + 2][1]);
  const loopTime = formatTimestamp(loopSample.prediction.atSecond);
  const loopDiff = Math.round((loopSample.prediction.actual ?? 0) - loopSample.prediction.predicted);
  const locale = await getLocale();
  const tSeo = await getTranslations("Seo.home");
  const tPricing = await getTranslations("Pricing");
  const home = `${SITE_URL}${localePath(locale, "/")}`;
  const hasGuides = guidesIn(locale).length > 0;
  const tryHref = localePath(locale, "/experimentar");

  // o que o Google lê sobre o produto: quem faz, o que é, quanto custa e as dúvidas da página
  const structured = [
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg`, email: SUPPORT_EMAIL },
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: home, inLanguage: locale },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: home,
      description: tSeo("description"),
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      inLanguage: locale,
      offers: { "@type": "Offer", name: tPricing("planName"), price: OFFER.amount.toFixed(2), priceCurrency: OFFER.currency },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (["1", "2", "3"] as const).map((n) => ({ "@type": "Question", name: t(`faq.q${n}`), acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`) } })),
    },
  ];

  const steps = ["one", "two", "three"] as const;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- hero: a promessa com a palavra circulada e o Reel anotado à mão ---------- */}
        <section className="mx-auto grid max-w-page items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:px-8 lg:pb-28 lg:pt-16">
          <div>
            <Reveal>
              <HandNote className="text-[26px] sm:text-[30px]">{c("pocket")}</HandNote>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-4 font-display text-[50px] font-extrabold leading-[0.98] tracking-[-0.05em] text-balance sm:text-[72px] lg:text-[84px]">
                {c("titleStart")}
                <PenCircle strokeWidth={5}>{c("titleCircled")}</PenCircle>
                {c("titleEnd")}
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-7 max-w-[50ch] text-[18px] leading-relaxed text-ink-muted sm:text-[20px]">{c("lead")}</p>
            </Reveal>
            <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={tryHref} className={buttonClasses("primary", "md", "min-h-14 px-7 text-[17px]")}>
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <HandNote className="text-[24px] text-ink-muted">{t("hero.ctaNote")}</HandNote>
            </Reveal>
            <Reveal as="ul" delay={240} className="mt-10 flex flex-col gap-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-[16.5px] font-medium">
                  <PenCheck className="h-6 w-6" />
                  {benefit}
                </li>
              ))}
            </Reveal>
          </div>

          {/* o Reel anotado: a frase riscada, o segundo circulado, a nota e o post-it */}
          <Reveal delay={150} className="relative mx-auto h-[620px] w-full max-w-[520px] sm:h-[680px]">
            <div className="absolute left-[2%] top-8 h-[560px] w-[280px] -rotate-3 rounded-[40px] border-2 border-[#1e1b18] bg-[#1e1b18] p-2.5 shadow-stamp">
              <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-[linear-gradient(170deg,#d8b28a_0%,#8a6446_55%,#3a2a1e_100%)]">
                <span className="absolute left-4 top-4 rounded-full bg-[#fffdf8] px-3 py-1 text-[12.5px] font-bold text-[#1e1b18]">{t("mock.example")}</span>
                <p className="absolute bottom-16 left-5 right-5 text-[16px] font-semibold leading-snug text-white [text-decoration-color:#9db5ff] [text-decoration-line:line-through] [text-decoration-thickness:3px]">
                  {t("hero.samplePhrase")}
                </p>
                <span className="absolute bottom-7 left-5 right-5 h-1.5 rounded-full bg-white/35">
                  <span className="absolute inset-y-0 left-0 w-[12%] rounded-full bg-white" />
                </span>
              </div>
            </div>
            {/* o segundo da queda, circulado, e a seta para a nota (a partir do tablet: no celular não cabe ao lado) */}
            <svg aria-hidden="true" viewBox="0 0 520 680" className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible text-accent sm:block">
              <path className="pen-draw" pathLength={1} d="M50 568 C 26 544, 44 506, 82 504 C 128 502, 142 548, 110 572 C 88 588, 52 584, 40 562" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path className="pen-draw" pathLength={1} d="M136 560 C 220 600, 300 580, 346 514" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path className="pen-draw" pathLength={1} d="M326 520 L 348 511 L 346 536" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <HandNote as="p" className="absolute right-0 top-[52%] hidden w-[176px] text-[26px] sm:block">
              {c("dropNote", { time: dropTime, lost })}
            </HandNote>
            <PostIt className="absolute right-0 top-0 w-[176px] sm:w-[184px]">
              <span className="font-hand text-[22px] font-semibold leading-none">{c("tryInstead")}</span>
              <p className="mt-1 font-hand text-[25px] font-bold leading-[1.05]">{c("sampleRewrite")}</p>
            </PostIt>
          </Reveal>
        </section>

        {/* ---------- a página anotada: o produto de verdade ---------- */}
        <section id="exemplo" className="scroll-mt-20 border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
            <SectionHeading eyebrow={c("pageEyebrow")} title={c("pageTitle")} lead={c("pageLead")} />
            <Reveal delay={120} className="mt-14 grid overflow-hidden rounded-[28px] border-2 border-ink bg-paper-raised shadow-[8px_8px_0_var(--ink)] lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-6 sm:p-9">
                <p className="t-label">{c("transcriptLabel")}</p>
                <ol className="mt-4">
                  {lines.map((line) => (
                    <li key={line.time} className="relative flex gap-4 border-b border-line py-3 text-[17px] leading-snug last:border-b-0 sm:text-[18.5px]">
                      <span className="w-10 shrink-0 pt-0.5 text-[14px] font-semibold tabular-nums text-ink-muted">{line.time}</span>
                      <span className={line.mark === "cut" || line.mark === "drop" ? "pen-strike" : line.mark === "keep" ? "marker" : undefined}>{line.text}</span>
                      {line.mark === "drop" && <HandNote className="ml-auto hidden shrink-0 text-[24px] sm:inline-block">{c("dropMark")}</HandNote>}
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="flex flex-col gap-5 border-t-2 border-dashed border-line bg-paper p-6 sm:p-8 lg:border-l-2 lg:border-t-0">
                <p className="t-label">{c("notesLabel")}</p>
                {notes.map((note, index) => (
                  <HandNote as="p" key={note} className="rotate-0 text-[26px]">
                    {index + 1}. {note}
                  </HandNote>
                ))}
                <div className="mt-auto rounded-2xl border-2 border-ink bg-ink p-5 text-paper">
                  <p className="text-[13.5px] opacity-75">{c("generateSummary")}</p>
                  <p className="mt-1 text-[18px] font-bold tracking-[-0.02em]">{c("generate")}</p>
                </div>
              </aside>
            </Reveal>
          </div>
        </section>

        {/* ---------- como funciona: três passos numerados à mão ---------- */}
        <section id="como-funciona" className="mx-auto max-w-page scroll-mt-20 px-5 py-24 lg:px-8 lg:py-28">
          <SectionHeading eyebrow={t("moments.eyebrow")} title={t("moments.title")} />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((key, index) => (
              <Reveal as="li" key={key} delay={index * 100} className="rounded-[24px] border-2 border-ink bg-paper-raised p-7 shadow-stamp">
                <span className="font-hand text-[64px] font-bold leading-none text-accent">{index + 1}.</span>
                <h3 className="mt-4 text-[22px] font-extrabold leading-snug tracking-[-0.03em]">
                  <PenUnderline>{t(`moments.${key}.title`)}</PenUnderline>
                </h3>
                <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">{t(`moments.${key}.text`)}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ---------- as sete frentes: o checklist do editor ---------- */}
        <section className="border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto grid max-w-page gap-12 px-5 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-8 lg:py-28">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading eyebrow={t("plan.eyebrow")} title={t("plan.title")} lead={t("plan.lead")} />
              <Reveal delay={120}>
                <Link href={tryHref} className={buttonClasses("primary", "md", "mt-8 min-h-12 px-6")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </Link>
              </Reveal>
            </div>
            <ul className="flex flex-col">
              {FRONTS.map((kind, index) => {
                const { title, body } = splitItem(t(`plan.items.${kind}`));
                return (
                  <Reveal as="li" key={kind} delay={(index % 4) * 60} className="flex gap-4 border-b border-line py-5 first:pt-0">
                    <PenCheck className="mt-1 h-7 w-7" />
                    <div>
                      <h3 className="text-[23px] font-extrabold tracking-[-0.03em]">{title}</h3>
                      {body && <p className="mt-1 text-[16px] leading-relaxed text-ink-muted">{body}</p>}
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- a previsão que se confere no Insights: num post-it ---------- */}
        <section className="mx-auto grid max-w-page items-center gap-14 px-5 py-24 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-28">
          <div>
            <SectionHeading eyebrow={t("loop.eyebrow")} title={t("loop.title")} />
            <Reveal delay={100}>
              <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-4 max-w-[54ch] text-[16.5px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
            </Reveal>
          </div>
          {/* um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
          <Reveal delay={160}>
            <PostIt className="mx-auto max-w-[460px] -rotate-2 p-8 sm:p-10">
              <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#5c544b]">
                {t("loop.metric", { time: loopTime })} · {t("loop.sampleTag")}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-6 text-[#1e1b18]">
                <div>
                  <p className="font-hand text-[26px] font-semibold leading-none">{t("loop.predicted")}</p>
                  <p className="mt-2 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{loopSample.prediction.predicted}%</p>
                </div>
                <div>
                  <p className="font-hand text-[26px] font-semibold leading-none">{t("loop.actual")}</p>
                  <p className="mt-2 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums text-[#1f47a6]">
                    <PenCircle strokeWidth={4}>{loopSample.prediction.actual}%</PenCircle>
                  </p>
                </div>
              </div>
              <p className="mt-7 text-[15px] font-semibold text-[#1e1b18]">{t("loop.sampleVerdict", { diff: loopDiff })}</p>
              <HandNote className="mt-2 text-[34px] !text-[#1f47a6]">{c("hit")}</HandNote>
            </PostIt>
          </Reveal>
        </section>

        {/* ---------- a oferta ---------- */}
        <section id="precos" className="scroll-mt-20 border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
            <PricingCards centered onceNote={c("onceNote")} />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="mx-auto grid max-w-page gap-10 px-5 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-8 lg:py-28">
          <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          <Reveal delay={120} className="border-t-2 border-dashed border-line lg:mt-2">
            {(["1", "2", "3"] as const).map((n) => (
              <details key={n} className="group border-b-2 border-dashed border-line py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[21px] font-extrabold tracking-[-0.03em] sm:text-[23px]">
                  {t(`faq.q${n}`)}
                  <span aria-hidden="true" className="font-hand text-[34px] font-bold leading-none text-accent transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-[64ch] text-[16.5px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* ---------- o último convite: a capa do caderno ---------- */}
        <section className="mx-auto max-w-page px-5 pb-24 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-[32px] border-2 border-ink bg-[#1e1b18] px-6 py-16 text-[#f6f0e4] shadow-[8px_8px_0_var(--kraft)] sm:px-14 sm:py-20">
            <div className="max-w-[720px]">
              <HandNote className="text-[30px] !text-[#9db5ff]">{c("trust")}</HandNote>
              <h2 className="mt-4 font-display text-[42px] font-extrabold leading-[1.02] tracking-[-0.05em] text-balance sm:text-[64px]">{t("final.title")}</h2>
              <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed opacity-80">{t("final.lead")}</p>
              <Link
                href={tryHref}
                className="mt-9 inline-flex min-h-14 items-center gap-2 rounded-[14px] border-2 border-[#f6f0e4] bg-[#1f47a6] px-7 text-[17px] font-bold text-white shadow-[4px_4px_0_#f6f0e4] transition-transform duration-150 hover:-translate-x-px hover:-translate-y-px hover:no-underline"
              >
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <p className="mt-4 text-[14px] opacity-70">{t("hero.ctaNote")}</p>
            </div>
          </Reveal>
        </section>

        <footer className="border-t-2 border-ink bg-paper-raised">
          <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-8">
            <div>
              <Logo size="sm" label={tCommon("brand")} />
              <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-ink-muted">{t("footer")}</p>
            </div>
            <nav aria-label={t("footerCols.product")}>
              <p className="text-[14px] font-bold">{t("footerCols.product")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <li>
                  <Link href={tryHref} className="text-ink-muted hover:text-ink">
                    {t("footerCols.try")}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/planos")} className="text-ink-muted hover:text-ink">
                    {tCommon("plans")}
                  </Link>
                </li>
                {hasGuides && (
                  <li>
                    <Link href={localePath(locale, "/guias")} className="text-ink-muted hover:text-ink">
                      {tCommon("guides")}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            <nav aria-label={t("footerCols.company")}>
              <p className="text-[14px] font-bold">{t("footerCols.company")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <li>
                  <Link href={localePath(locale, "/partners")} className="text-ink-muted hover:text-ink">
                    {t("partners.cta")}
                  </Link>
                </li>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ink-muted hover:text-ink">
                    {tCommon("support")}
                  </a>
                </li>
              </ul>
            </nav>
            <nav aria-label={t("footerCols.legal")}>
              <p className="text-[14px] font-bold">{t("footerCols.legal")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <li>
                  <Link href={localePath(locale, "/privacidade")} className="text-ink-muted hover:text-ink">
                    {tCommon("privacy")}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/termos")} className="text-ink-muted hover:text-ink">
                    {tCommon("terms")}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-page px-5 py-5 text-[13px] text-ink-muted lg:px-8">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
