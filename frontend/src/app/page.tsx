import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight, Check, Download, Film, Gauge, Layers, Megaphone, Quote, Scissors, Target, Type } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PricingCards } from "@/components/PricingCards";
import { NotebookHero } from "@/components/landing/NotebookHero";
import { TimelineRuler } from "@/components/landing/TimelineRuler";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
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

/* Cada frente do plano com o seu ícone, para a grade dar para varrer sem ler tudo. */
const FRONTS = [
  { kind: "hook", Icon: Target },
  { kind: "cut", Icon: Scissors },
  { kind: "pacing", Icon: Gauge },
  { kind: "broll", Icon: Film },
  { kind: "caption", Icon: Type },
  { kind: "structure", Icon: Layers },
  { kind: "cta", Icon: Megaphone },
] as const;

/* "Gancho: o que dizer…" → título e descrição, nos três idiomas. */
function splitItem(text: string): { title: string; body: string } {
  const at = text.indexOf(":");
  return at > 0 ? { title: text.slice(0, at), body: text.slice(at + 1).trim() } : { title: text, body: "" };
}

/** O título de cada seção. `inverse`: sobre a tinta (a seção do exemplo), com as cores trocadas. */
function SectionHeading({ eyebrow, title, lead, tone = "default" }: { eyebrow: string; title: string; lead?: string; tone?: "default" | "inverse" }) {
  return (
    <Reveal className="max-w-[640px]">
      <p className={tone === "inverse" ? "font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-kraft-inverse" : "eyebrow"}>{eyebrow}</p>
      <h2 className="mt-4 font-serif text-[40px] font-normal leading-[1.02] tracking-[-0.015em] text-balance sm:text-[56px]">{title}</h2>
      {lead && <p className={tone === "inverse" ? "mt-5 text-[16.5px] leading-relaxed opacity-75" : "mt-5 text-[16.5px] leading-relaxed text-ink-muted"}>{lead}</p>}
    </Reveal>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const tCommon = await getTranslations("Common");
  const dropTime = formatTimestamp(sample.dropAtSec);
  // as três primeiras linhas do plano de exemplo, do mesmo vídeo da curva
  const planItems = t.raw("hero.planItems") as { time: string; kind: string; text: string }[];
  const previewPoints = t.raw("preview.points") as string[];
  const benefits = t.raw("hero.benefits") as string[];
  const heroArt = t.raw("hero.art") as { cut: string; cutDetail: string; accept: string; dropCaption: string };
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
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      email: SUPPORT_EMAIL,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: home,
      inLanguage: locale,
    },
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
      mainEntity: (["1", "2", "3"] as const).map((n) => ({
        "@type": "Question",
        name: t(`faq.q${n}`),
        acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`) },
      })),
    },
  ];

  const steps = ["one", "two", "three"] as const;
  const heroLabels = {
    window: t("mock.window"),
    example: t("mock.example"),
    marginalia: t("hero.marginalia", { time: dropTime, lost }),
    phrase: t("hero.samplePhrase"),
    planLabel: t("hero.planLabel"),
    plan: planItems,
    cut: heroArt.cut,
    cutDetail: heroArt.cutDetail,
    accept: heroArt.accept,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- hero: a promessa em tipografia grande e o caderno com a análise ---------- */}
        <section className="relative">
          <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:px-10 lg:pb-20 lg:pt-20">
            <div className="relative z-10">
              <Reveal>
                <p className="inline-flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-kraft-ink">
                  <span aria-hidden="true" className="h-4 w-1.5 rounded-full bg-ink" />
                  {t("hero.eyebrow")}
                </p>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="mt-6 max-w-[15ch] font-serif text-[52px] font-normal leading-[0.98] tracking-[-0.02em] text-balance sm:text-[68px] lg:text-[82px]">{t("hero.title")}</h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-7 max-w-[46ch] text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">{t("hero.lead")}</p>
              </Reveal>
              <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-3">
                <Link href={tryHref} className={buttonClasses("primary", "md", "min-h-12 px-6 text-[15.5px]")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </Link>
                <a href="#exemplo" className="inline-flex min-h-12 items-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold text-ink underline-offset-4 hover:underline">
                  {t("hero.secondary")}
                  <ArrowDown size={15} strokeWidth={2.25} aria-hidden="true" />
                </a>
              </Reveal>
              <Reveal delay={220}>
                <p className="mt-3 font-mono text-[12px] text-ink-muted">{t("hero.ctaNote")}</p>
              </Reveal>
              {/* o que a pessoa ganha, numa folha pautada */}
              <Reveal as="ul" delay={260} className="mt-10 max-w-[480px] border-b border-line">
                {benefits.map((benefit, index) => (
                  <li key={benefit} className="flex items-baseline gap-4 border-t border-line py-3 text-[15px]">
                    <span className="font-mono text-[12px] font-medium text-kraft-ink">0{index + 1}</span>
                    {benefit}
                  </li>
                ))}
              </Reveal>
            </div>

            <NotebookHero labels={heroLabels} curve={sample.retention} duration={sample.durationSec} dropAt={sample.dropAtSec} dropTime={dropTime} lost={lost} />
          </div>

          {/* a régua da timeline: a borda das páginas do caderno, com a agulha no segundo da queda */}
          <div className="mx-auto max-w-[1280px] px-5 pb-16 lg:px-10">
            <TimelineRuler duration={sample.durationSec} dropAt={sample.dropAtSec} dropLabel={heroArt.dropCaption} />
          </div>
        </section>

        {/* ---------- como funciona: uma página pautada, com a margem do caderno ---------- */}
        <section id="como-funciona" className="relative scroll-mt-20 border-y border-line bg-paper-raised">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, rgba(var(--ink-rgb), 0.05) 39px, rgba(var(--ink-rgb), 0.05) 40px)" }}
          />
          <span aria-hidden="true" className="absolute inset-y-0 left-[6%] hidden w-px bg-[rgba(201,130,74,0.5)] lg:block" />
          <div className="relative mx-auto max-w-[1280px] px-5 py-24 lg:px-10 lg:py-28 lg:pl-[10%]">
            <SectionHeading eyebrow={t("moments.eyebrow")} title={t("moments.title")} />
            <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
              {steps.map((key, index) => (
                <Reveal as="li" key={key} delay={index * 120} className="border-t-2 border-ink pt-6">
                  <span className="font-serif text-[72px] leading-none text-kraft">0{index + 1}</span>
                  <h3 className="mt-5 text-[21px] font-bold leading-snug tracking-[-0.015em]">{t(`moments.${key}.title`)}</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">{t(`moments.${key}.text`)}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- o que volta: a janela do produto sobre a tinta ---------- */}
        <section id="exemplo" className="scroll-mt-20 bg-ink text-paper">
          <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-5 py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:px-10 lg:py-32">
            <div>
              <SectionHeading eyebrow={t("preview.eyebrow")} title={t("preview.title")} lead={t("preview.lead")} tone="inverse" />
              <ul className="mt-10 border-b border-[rgba(var(--paper-rgb),0.16)]">
                {previewPoints.map((point, index) => {
                  const Icon = [Target, Quote, Scissors][index] ?? Target;
                  return (
                    <Reveal as="li" key={point} delay={index * 80} className="flex items-center gap-4 border-t border-[rgba(var(--paper-rgb),0.16)] py-4">
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-kraft-inverse" />
                      <span className="text-[16px] leading-snug">{point}</span>
                    </Reveal>
                  );
                })}
              </ul>
            </div>

            {/* a janela do produto: a queda, a frase, o plano e o vídeo editado */}
            <Reveal delay={120} className="relative">
              <div className="relative overflow-hidden rounded-[24px] border border-line bg-paper-raised text-ink shadow-lift">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--ink-rgb),0.12)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--ink-rgb),0.12)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--ink-rgb),0.12)]" />
                  </div>
                  {/* os números da janela são de exemplo (fixture): dito na própria janela, não só no código */}
                  <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink-muted">
                    {t("mock.window")}
                    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]">{t("mock.example")}</span>
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("mock.ready")}
                  </span>
                </div>

                <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-[64px] leading-none text-accent">{dropTime}</p>
                      <span className="rounded-full bg-kraft-soft px-2.5 py-1 font-mono text-[12px] font-medium tabular-nums text-kraft-ink">−{lost}%</span>
                    </div>
                    <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
                    <p className="mt-2 text-[12.5px] leading-snug text-ink-muted">{t("hero.marginalia", { time: dropTime, lost })}</p>
                    <p className="mt-1.5 font-serif text-[19px] italic leading-[1.25]">&ldquo;{t("hero.samplePhrase")}&rdquo;</p>
                  </div>
                  <div>
                    <p className="t-label">{t("hero.planLabel")}</p>
                    <ol className="mt-2">
                      {planItems.map((item) => (
                        <li key={item.time + item.kind} className="border-t border-line py-3">
                          <p className="flex items-baseline gap-2.5">
                            <span className="font-mono text-[12px] font-medium tabular-nums text-accent">{item.time}</span>
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-muted">{item.kind}</span>
                          </p>
                          <p className="mt-1 text-[14px] leading-snug">{item.text}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line bg-[rgba(var(--accent-rgb),0.06)] px-6 py-4">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <Scissors size={15} strokeWidth={2} aria-hidden="true" className="text-accent" />
                    {t("mock.edited")}
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-paper-raised">
                    <Download size={13} strokeWidth={2.25} aria-hidden="true" />
                    MP4
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- as sete frentes: o sumário do caderno ---------- */}
        <section className="mx-auto grid max-w-[1280px] gap-14 px-5 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:px-10 lg:py-32">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading eyebrow={t("plan.eyebrow")} title={t("plan.title")} lead={t("plan.lead")} />
            <Reveal delay={120}>
              <Link href={tryHref} className={buttonClasses("primary", "md", "mt-8 min-h-12 px-6")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <p className="mt-3 max-w-[36ch] text-[13.5px] leading-relaxed text-ink-muted">{t("plan.tileTitle")}</p>
            </Reveal>
          </div>
          <ol className="border-b border-line">
            {FRONTS.map(({ kind, Icon }, index) => {
              const { title, body } = splitItem(t(`plan.items.${kind}`));
              return (
                <Reveal as="li" key={kind} delay={(index % 4) * 60} className="group grid grid-cols-[44px_minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-line py-6 sm:grid-cols-[56px_200px_minmax(0,1fr)_auto]">
                  <span className="font-mono text-[12.5px] font-medium text-kraft-ink">0{index + 1}</span>
                  <h3 className="font-serif text-[30px] leading-none tracking-[-0.01em] sm:text-[34px]">{title}</h3>
                  {body && <p className="col-start-2 mt-2 text-[15px] leading-relaxed text-ink-muted sm:col-start-auto sm:mt-0">{body}</p>}
                  <span aria-hidden="true" className="col-start-3 row-start-1 grid h-10 w-10 place-items-center self-center rounded-full border border-line text-ink transition-colors group-hover:border-kraft group-hover:bg-kraft group-hover:text-[#1e1b18] sm:col-start-4">
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                </Reveal>
              );
            })}
          </ol>
        </section>

        {/* ---------- a previsão que se confere no Insights: a capa caramelo ---------- */}
        <section className="relative overflow-hidden bg-[#c9824a] text-[#1e1b18]">
          <span aria-hidden="true" className="absolute inset-y-0 right-[9%] hidden w-7 bg-[#1e1b18] lg:block" />
          <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-5 py-24 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-28 lg:pr-[16%]">
            <Reveal>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.12em]">{t("loop.eyebrow")}</p>
              <h2 className="mt-3 max-w-[16ch] font-serif text-[40px] font-normal leading-[1.02] tracking-[-0.01em] text-balance sm:text-[56px]">{t("loop.title")}</h2>
              <p className="mt-6 max-w-[54ch] text-[16.5px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed opacity-80">{t("loop.text2")}</p>
            </Reveal>
            {/* um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
            <Reveal delay={150} className="rounded-[24px] bg-[#fbf3e6] p-6 shadow-lift sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.1em] text-[#5c544b]">{t("loop.metric", { time: loopTime })}</p>
                <span className="rounded-full border border-[#e4d6c1] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#5c544b]">{t("loop.sampleTag")}</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="border-t-2 border-[#1e1b18] pt-4">
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-[#5c544b]">{t("loop.predicted")}</p>
                  <p className="mt-2 font-serif text-[72px] leading-none tabular-nums">{loopSample.prediction.predicted}%</p>
                </div>
                <div className="border-t-2 border-[#1f47a6] pt-4">
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-[#1f47a6]">{t("loop.actual")}</p>
                  <p className="mt-2 font-serif text-[72px] leading-none tabular-nums text-[#1f47a6]">{loopSample.prediction.actual}%</p>
                </div>
              </div>
              <p className="mt-6 flex items-start gap-2 border-t border-[#e4d6c1] pt-4 text-[14px] font-medium">
                <Check size={16} strokeWidth={2.5} aria-hidden="true" className="mt-0.5 shrink-0 text-[#3f7a3a]" />
                {t("loop.sampleVerdict", { diff: loopDiff })}
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------- a oferta ---------- */}
        <section id="precos" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-[1280px] px-5 py-24 lg:px-10 lg:py-32">
            <PricingCards centered />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:px-10">
          <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          <Reveal delay={120} className="border-b border-line">
            {(["1", "2", "3"] as const).map((n) => (
              <details key={n} className="group border-t border-line py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-[26px] leading-tight sm:text-[30px]">
                  {t(`faq.q${n}`)}
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line font-sans text-[18px] font-light transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* ---------- o último convite: o caderno em tamanho grande ---------- */}
        <section className="mx-auto max-w-[1280px] px-5 pb-24 lg:px-10">
          <Reveal className="relative overflow-hidden rounded-[36px] bg-[#c9824a] px-6 pb-24 pt-16 text-[#1e1b18] sm:px-14 sm:pt-20">
            <span aria-hidden="true" className="absolute inset-y-0 right-[12%] w-6 bg-[#1e1b18] sm:w-8" />
            <span aria-hidden="true" className="absolute bottom-8 left-8 right-8 h-4 rounded-full bg-[#fbf3e6]" />
            <span aria-hidden="true" className="absolute -top-10 right-[7%] hidden h-[420px] w-6 origin-top rotate-[20deg] rounded-full bg-[#1f47a6] sm:block" />
            <div className="relative max-w-[640px]">
              <h2 className="font-serif text-[44px] font-normal leading-[1] tracking-[-0.015em] text-balance sm:text-[64px]">{t("final.title")}</h2>
              <p className="mt-6 max-w-[48ch] text-[17px] leading-relaxed">{t("final.lead")}</p>
              <Link href={tryHref} className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#1e1b18] px-6 text-[15.5px] font-semibold text-[#fbf3e6] transition-transform duration-150 hover:-translate-y-px hover:no-underline">
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <p className="mt-3 font-mono text-[12px]">{t("hero.ctaNote")}</p>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-10">
            <div>
              <Logo size="sm" label={tCommon("brand")} />
              <p className="mt-4 max-w-[36ch] text-[13.5px] leading-relaxed text-ink-muted">{t("footer")}</p>
            </div>
            <nav aria-label={t("footerCols.product")}>
              <p className="t-label">{t("footerCols.product")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14px]">
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
              <p className="t-label">{t("footerCols.company")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14px]">
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
              <p className="t-label">{t("footerCols.legal")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14px]">
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
          {/* o wordmark grande, como a assinatura no fim do caderno */}
          <div aria-hidden="true" className="mx-auto max-w-[1280px] overflow-hidden px-5 lg:px-10">
            <p className="select-none whitespace-nowrap font-sans text-[22vw] font-bold leading-[0.8] tracking-[-0.06em] text-[rgba(var(--ink-rgb),0.07)] lg:text-[268px]">publishub</p>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-[1280px] px-5 py-5 font-mono text-[12px] text-ink-muted lg:px-10">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
