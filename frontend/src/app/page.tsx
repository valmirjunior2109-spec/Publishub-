import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Download, Film, Gauge, Layers, ListChecks, Megaphone, Scissors, Sparkles, Target, Type, Upload, Wand2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { HeroUpload } from "@/components/HeroUpload";
import { PricingCards } from "@/components/PricingCards";
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

function SectionHeading({ eyebrow, title, lead, center = false }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-[680px] text-center" : "max-w-[640px]"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[30px] font-bold leading-[1.12] tracking-[-0.022em] text-balance sm:text-[40px]">{title}</h2>
      {lead && <p className="mt-4 text-[16.5px] leading-relaxed text-ink-muted">{lead}</p>}
    </Reveal>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const tCommon = await getTranslations("Common");
  const dropTime = formatTimestamp(sample.dropAtSec);
  // as três primeiras linhas do plano de exemplo, do mesmo vídeo da curva
  const planItems = t.raw("hero.planItems") as { time: string; kind: string; text: string }[];
  const stats = t.raw("metrics.items") as { value: string; label: string }[];
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

  const steps = [
    { key: "one", Icon: Upload },
    { key: "two", Icon: ListChecks },
    { key: "three", Icon: Wand2 },
  ] as const;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- hero: a promessa, o teste grátis e a janela do produto ---------- */}
        <section className="relative">
          <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="bg-glow pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 opacity-70" />

          <div className="mx-auto grid max-w-page items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-8 lg:pb-28 lg:pt-20">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.25)] bg-paper-raised px-3.5 py-1.5 text-[13px] font-medium text-ink shadow-float">
                  <Sparkles size={14} strokeWidth={2} aria-hidden="true" className="text-accent" />
                  {t("hero.eyebrow")}
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-6 max-w-[20ch] font-display text-[36px] font-extrabold leading-[1.08] tracking-[-0.028em] text-balance sm:text-[46px] lg:text-[52px]">{t("hero.title")}</h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">{t("hero.lead")}</p>
              </Reveal>
              {/* a caixa é o CTA: o teste grátis começa aqui, não numa página adiante */}
              <Reveal delay={240} className="mt-8 max-w-[560px]">
                <HeroUpload />
              </Reveal>
              <Reveal delay={320} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink-muted">
                <a href="#como-funciona" className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-accent hover:no-underline">
                  {t("hero.secondary")}
                  <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </a>
                <span>{t("hero.note")}</span>
              </Reveal>
            </div>

            {/* a janela do produto: a queda, a frase, o plano e o vídeo editado */}
            <Reveal delay={200} className="relative">
              <div aria-hidden="true" className="bg-glow absolute -inset-8 opacity-80" />
              <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-lift">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--ink-rgb),0.12)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--ink-rgb),0.12)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgba(var(--ink-rgb),0.12)]" />
                  </div>
                  <p className="text-[12.5px] font-medium text-ink-muted">{t("mock.window")}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("mock.ready")}
                  </span>
                </div>

                <div className="p-5">
                  <div className="rounded-xl border border-line bg-paper p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-[34px] font-extrabold leading-none tracking-[-0.04em] text-accent">{dropTime}</p>
                      <span className="rounded-full bg-[rgba(var(--ink-rgb),0.06)] px-2.5 py-1 text-[12px] font-semibold tabular-nums">−{lost}%</span>
                    </div>
                    <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
                    <p className="mt-2 text-[12.5px] leading-snug text-ink-muted">{t("hero.marginalia", { time: dropTime, lost })}</p>
                    <p className="mt-1.5 text-[14px] font-medium leading-snug">&ldquo;{t("hero.samplePhrase")}&rdquo;</p>
                  </div>

                  <p className="t-label mt-5">{t("hero.planLabel")}</p>
                  <ol className="mt-2.5 flex flex-col gap-2">
                    {planItems.map((item) => (
                      <li key={item.time + item.kind} className="flex items-start gap-3 rounded-lg border border-line bg-paper-raised px-3.5 py-2.5">
                        <span className="mt-0.5 shrink-0 rounded-md bg-accent-soft px-2 py-0.5 font-display text-[12px] font-bold tabular-nums text-accent">{item.time}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{item.kind}</p>
                          <p className="text-[13.5px] leading-snug">{item.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line bg-[rgba(var(--accent-rgb),0.06)] px-5 py-3.5">
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

        {/* ---------- em números: o que o produto entrega, sem inventar cliente ---------- */}
        <section className="border-y border-line bg-paper-raised">
          <dl className="mx-auto grid max-w-page grid-cols-2 gap-px bg-line lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-paper-raised px-5 py-8 text-center lg:px-8">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-[30px] font-extrabold tracking-[-0.035em] sm:text-[36px]">{stat.value}</span>
                  <span className="mt-1 block text-[13.5px] text-ink-muted">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- a previsão que se confere no Insights ---------- */}
        <section className="mx-auto grid max-w-page items-center gap-12 px-5 py-24 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <SectionHeading eyebrow={t("loop.eyebrow")} title={t("loop.title")} />
            <Reveal delay={100}>
              <p className="mt-5 max-w-[56ch] text-[16.5px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
            </Reveal>
          </div>
          {/* um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
          <Reveal delay={200} className="relative">
            <div aria-hidden="true" className="bg-glow absolute -inset-6 opacity-60" />
            <div className="relative rounded-2xl border border-line bg-paper-raised p-6 shadow-card sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="t-label">{t("loop.metric", { time: loopTime })}</p>
                <span className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-muted">{t("loop.sampleTag")}</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-paper p-5">
                  <p className="t-label">{t("loop.predicted")}</p>
                  <p className="mt-2 font-display text-[52px] font-extrabold leading-none tracking-[-0.045em] tabular-nums">{loopSample.prediction.predicted}%</p>
                </div>
                <div className="rounded-xl bg-accent-soft p-5">
                  <p className="t-label !text-accent">{t("loop.actual")}</p>
                  <p className="mt-2 font-display text-[52px] font-extrabold leading-none tracking-[-0.045em] tabular-nums text-accent">{loopSample.prediction.actual}%</p>
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.06)] p-3.5 text-[13.5px] font-medium">
                <span aria-hidden="true" className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-confirmed" />
                {t("loop.sampleVerdict", { diff: loopDiff })}
              </p>
            </div>
          </Reveal>
        </section>

        {/* ---------- como funciona: três passos ---------- */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-line bg-paper-raised">
          <div className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
            <SectionHeading eyebrow={t("moments.eyebrow")} title={t("moments.title")} center />
            <ol className="mt-14 grid gap-5 md:grid-cols-3">
              {steps.map(({ key, Icon }, index) => (
                <Reveal as="li" key={key} delay={index * 120} className="relative rounded-2xl border border-line bg-paper p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent-bright to-accent text-paper-raised shadow-glow">
                      <Icon size={20} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="font-display text-[14px] font-bold tabular-nums text-ink-muted">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 font-display text-[20px] font-bold tracking-[-0.02em]">{t(`moments.${key}.title`)}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{t(`moments.${key}.text`)}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- as sete frentes do plano ---------- */}
        <section className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
          <SectionHeading eyebrow={t("plan.eyebrow")} title={t("plan.title")} lead={t("plan.lead")} center />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FRONTS.map(({ kind, Icon }, index) => {
              const { title, body } = splitItem(t(`plan.items.${kind}`));
              return (
                <Reveal key={kind} delay={(index % 4) * 80} className="group rounded-2xl border border-line bg-paper-raised p-6 shadow-card transition-transform duration-200 hover:-translate-y-0.5">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Icon size={19} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-[17px] font-bold tracking-[-0.015em]">{title}</h3>
                  {body && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{body}</p>}
                </Reveal>
              );
            })}
            {/* o oitavo lugar da grade é o convite: ver as sete frentes no próprio vídeo */}
            <Reveal delay={240} className="flex flex-col justify-between rounded-2xl bg-ink p-6 text-paper">
              <div>
                <h3 className="font-display text-[19px] font-bold leading-snug tracking-[-0.02em]">{t("plan.tileTitle")}</h3>
                <p className="mt-2 text-[14px] leading-relaxed opacity-75">{t("hero.ctaNote")}</p>
              </div>
              <Link href={tryHref} className={buttonClasses("primary", "md", "mt-6 w-full")}>
                {t("hero.cta")}
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ---------- a oferta ---------- */}
        <section id="precos" className="relative scroll-mt-20 border-y border-line bg-paper-raised">
          <div aria-hidden="true" className="bg-glow pointer-events-none absolute left-1/2 top-24 h-[420px] w-[720px] -translate-x-1/2 opacity-50" />
          <div className="relative mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
            <PricingCards centered />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="mx-auto grid max-w-page gap-10 px-5 py-24 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:px-8">
          <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          <Reveal delay={120} className="flex flex-col gap-3">
            {(["1", "2", "3"] as const).map((n) => (
              <details key={n} className="group rounded-xl border border-line bg-paper-raised px-5 py-4 shadow-float open:shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                  {t(`faq.q${n}`)}
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(var(--ink-rgb),0.06)] text-[18px] font-light transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* ---------- o último convite ---------- */}
        <section className="mx-auto max-w-page px-5 pb-24 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-2xl bg-ink px-6 py-16 text-center text-paper sm:px-12">
            <div aria-hidden="true" className="bg-glow absolute -top-24 left-1/2 h-72 w-[640px] -translate-x-1/2 opacity-90" />
            <div className="relative">
              <h2 className="mx-auto max-w-[20ch] font-display text-[30px] font-extrabold leading-[1.12] tracking-[-0.025em] text-balance sm:text-[42px]">{t("final.title")}</h2>
              <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-relaxed opacity-75">{t("final.lead")}</p>
              <Link href={tryHref} className={buttonClasses("primary", "md", "mt-8 min-h-12 px-7 text-[15.5px]")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <p className="mt-3 text-[13px] opacity-60">{t("hero.ctaNote")}</p>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-line bg-paper-raised">
          <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-8">
            <div>
              <Logo size="sm" label={tCommon("brand")} />
              <p className="mt-4 max-w-[36ch] text-[13.5px] leading-relaxed text-ink-muted">{t("footer")}</p>
            </div>
            <nav aria-label={t("footerCols.product")}>
              <p className="text-[13px] font-semibold">{t("footerCols.product")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[13.5px]">
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
              <p className="text-[13px] font-semibold">{t("footerCols.company")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[13.5px]">
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
              <p className="text-[13px] font-semibold">{t("footerCols.legal")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[13.5px]">
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
            <p className="mx-auto max-w-page px-5 py-5 text-[12.5px] text-ink-muted lg:px-8">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
