import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Check, Film, Gauge, Layers, Megaphone, Quote, Scissors, Target, Type } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { ProductShot } from "@/components/landing/ProductShot";
import { PricingCards } from "@/components/PricingCards";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
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

/* Cada frente do plano com o seu ícone. */
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

/* As seções escuras têm cor fixa: são o contraste da página, nos dois temas. */
const DARK = "bg-black text-[#f5f5f7]";
const DARK_MUTED = "text-[#a1a1a6]";

/** O título de cada seção, centrado. `dark`: sobre as seções pretas. */
function SectionHeading({ eyebrow, title, lead, dark = false }: { eyebrow: string; title: string; lead?: string; dark?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-[780px] text-center">
      <p className={dark ? "text-[14px] font-semibold tracking-[-0.01em] text-[#8fb0ff]" : "eyebrow"}>{eyebrow}</p>
      <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] text-balance sm:text-[56px]">{title}</h2>
      {lead && <p className={`mx-auto mt-5 max-w-[60ch] text-[17px] leading-relaxed sm:text-[19px] ${dark ? DARK_MUTED : "text-ink-muted"}`}>{lead}</p>}
    </Reveal>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const tCommon = await getTranslations("Common");
  const tAnalysis = await getTranslations("Analysis");
  const dropTime = formatTimestamp(sample.dropAtSec);
  const planItems = t.raw("hero.planItems") as { time: string; kind: string; text: string }[];
  const previewPoints = t.raw("preview.points") as string[];
  const benefits = t.raw("hero.benefits") as string[];
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

  const shotLabels = {
    brand: tCommon("brand"),
    dropEyebrow: tAnalysis("insight.eyebrowEstimated"),
    dropBadge: tAnalysis("meta.likelyDropBadge", { time: dropTime }),
    phrase: t("hero.samplePhrase"),
    marginalia: t("hero.marginalia", { time: dropTime, lost }),
    example: t("mock.example"),
    plan: planItems,
    apply: tAnalysis("review.apply.cta", { count: 2 }),
    accepted: tAnalysis("review.actions.accepted"),
  };
  const steps = ["one", "two", "three"] as const;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- hero: a promessa, centrada, e o produto logo abaixo ---------- */}
        <section className="bg-paper-raised">
          <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-16 text-center lg:px-8 lg:pb-28 lg:pt-24">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-1.5 text-[13.5px] font-medium">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
                {t("hero.eyebrow")}
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mx-auto mt-7 max-w-[16ch] font-display text-[46px] font-semibold leading-[1.02] tracking-[-0.055em] text-balance sm:text-[68px] lg:text-[84px]">{t("hero.title")}</h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mx-auto mt-6 max-w-[54ch] text-[18px] leading-relaxed text-ink-muted sm:text-[20px]">{t("hero.lead")}</p>
            </Reveal>
            <Reveal delay={180} className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href={tryHref} className={buttonClasses("primary", "md", "min-h-12 px-7 text-[15.5px]")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <a href="#exemplo" className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-5 text-[15.5px] font-semibold text-accent hover:underline">
                {t("hero.secondary")}
                <ArrowRight size={15} strokeWidth={2.25} aria-hidden="true" />
              </a>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-3 text-[13px] text-ink-muted">{t("hero.ctaNote")}</p>
            </Reveal>

            <Reveal delay={260} className="mt-16 text-left">
              <ProductShot labels={shotLabels} curve={sample.retention} duration={sample.durationSec} dropAt={sample.dropAtSec} dropTime={dropTime} lost={lost} className="mx-auto max-w-[1040px]" />
            </Reveal>

            {/* o que a pessoa ganha, em três colunas */}
            <ul className="mx-auto mt-20 grid max-w-[1040px] gap-8 text-left sm:grid-cols-3">
              {benefits.map((benefit, index) => (
                <Reveal as="li" key={benefit} delay={index * 80} className="border-t border-line pt-5">
                  <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent">
                    <Check size={16} strokeWidth={2.5} />
                  </span>
                  <p className="mt-4 text-[17px] font-semibold leading-snug tracking-[-0.02em]">{benefit}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- escuro: o que volta, com os cortes em destaque ---------- */}
        <section id="exemplo" className={`relative scroll-mt-16 overflow-hidden ${DARK}`}>
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(79,125,255,0.35),transparent)]" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-24 lg:px-8 lg:py-32">
            <SectionHeading eyebrow={t("preview.eyebrow")} title={t("preview.title")} lead={t("preview.lead")} dark />

            {/* a revisão dos cortes: a linha do tempo e as sugestões */}
            <Reveal delay={120} className="mx-auto mt-16 max-w-[980px] rounded-[24px] border border-white/10 bg-[#111113] p-6 shadow-[0_40px_120px_-40px_rgba(79,125,255,0.5)] sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[20px] font-semibold tracking-[-0.03em]">{tAnalysis("review.title", { count: 3 })}</p>
                <p className={`font-mono text-[13px] ${DARK_MUTED}`}>
                  {formatTimestamp(sample.durationSec)} → <span className="text-[#8fb0ff]">{formatTimestamp(sample.durationSec - 6)}</span>
                </p>
              </div>
              <div className="relative mt-6 h-12 rounded-xl bg-white/[0.06]">
                <span className="absolute inset-y-1.5 left-[0%] w-[12%] rounded-lg bg-[#4f7dff]" />
                <span className="absolute inset-y-1.5 left-[47%] w-[6%] rounded-lg bg-[#4f7dff]" />
                <span className="absolute inset-y-1.5 left-[86%] w-[14%] rounded-lg border-2 border-dashed border-white/30" />
                <span className="absolute -top-2 bottom-[-8px] left-[11.7%] w-[3px] rounded-full bg-[#c9824a]" />
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {planItems.map((item, index) => (
                  <div key={item.time + item.kind} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px] text-[#8fb0ff]">{item.time}</span>
                      <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a6]">{item.kind}</span>
                    </div>
                    <p className="mt-3 text-[15px] leading-snug">{item.text}</p>
                    <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${index < 2 ? "bg-[#4f7dff] text-white" : "border border-white/20 text-[#a1a1a6]"}`}>
                      {index < 2 && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                      {index < 2 ? tAnalysis("review.actions.accepted") : tAnalysis("review.actions.accept")}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>

            <ul className="mx-auto mt-14 grid max-w-[980px] gap-6 sm:grid-cols-3">
              {previewPoints.map((point, index) => {
                const Icon = [Target, Quote, Scissors][index] ?? Target;
                return (
                  <Reveal as="li" key={point} delay={index * 80} className="flex items-start gap-3">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8fb0ff]" />
                    <span className="text-[16px] leading-snug">{point}</span>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- claro: as sete frentes, em grade ---------- */}
        <section className="bg-paper">
          <div className="mx-auto max-w-[1200px] px-5 py-24 lg:px-8 lg:py-32">
            <SectionHeading eyebrow={t("plan.eyebrow")} title={t("plan.title")} lead={t("plan.lead")} />
            <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FRONTS.map(({ kind, Icon }, index) => {
                const { title, body } = splitItem(t(`plan.items.${kind}`));
                const featured = index === 0;
                return (
                  <Reveal
                    key={kind}
                    delay={(index % 3) * 70}
                    className={`flex flex-col justify-between rounded-[28px] border border-line bg-paper-raised p-7 transition-transform duration-300 hover:-translate-y-1 ${featured ? "md:col-span-2 lg:row-span-1" : ""}`}
                  >
                    <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                      <Icon size={20} strokeWidth={1.9} />
                    </span>
                    {featured && (
                      // o gancho é o que mais pesa: o card maior mostra os três primeiros segundos
                      <div aria-hidden="true" className="mt-8">
                        <div className="relative h-3 rounded-full bg-paper">
                          <span className="absolute inset-y-0 left-0 w-[18%] rounded-full bg-accent" />
                        </div>
                        <div className="mt-2 flex justify-between font-mono text-[12px] text-ink-muted">
                          <span>0:00</span>
                          <span className="text-accent">0:03</span>
                          <span>{formatTimestamp(sample.durationSec)}</span>
                        </div>
                      </div>
                    )}
                    <div className={featured ? "mt-8" : "mt-10"}>
                      <h3 className={`font-semibold tracking-[-0.035em] ${featured ? "text-[30px]" : "text-[22px]"}`}>{title}</h3>
                      {body && <p className="mt-2 text-[15.5px] leading-relaxed text-ink-muted">{body}</p>}
                    </div>
                  </Reveal>
                );
              })}
              {/* o último lugar da grade é o convite */}
              <Reveal delay={140} className={`flex flex-col justify-between rounded-[28px] p-7 ${DARK}`}>
                <h3 className="text-[24px] font-semibold leading-tight tracking-[-0.035em]">{t("plan.tileTitle")}</h3>
                <Link href={tryHref} className="mt-10 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white px-5 text-[14.5px] font-semibold text-black hover:no-underline">
                  {t("hero.cta")}
                  <ArrowRight size={15} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- claro: como funciona ---------- */}
        <section id="como-funciona" className="scroll-mt-16 bg-paper-raised">
          <div className="mx-auto max-w-[1200px] px-5 py-24 lg:px-8 lg:py-32">
            <SectionHeading eyebrow={t("moments.eyebrow")} title={t("moments.title")} />
            <ol className="mt-16 grid gap-10 md:grid-cols-3">
              {steps.map((key, index) => (
                <Reveal as="li" key={key} delay={index * 100}>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-[18px] font-semibold text-paper-raised">{index + 1}</span>
                  <h3 className="mt-6 text-[22px] font-semibold leading-snug tracking-[-0.035em]">{t(`moments.${key}.title`)}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{t(`moments.${key}.text`)}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- escuro: a previsão que se confere no Insights ---------- */}
        <section className={`relative overflow-hidden ${DARK}`}>
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[820px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(79,125,255,0.28),transparent)]" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-24 lg:px-8 lg:py-32">
            <SectionHeading eyebrow={t("loop.eyebrow")} title={t("loop.title")} dark />
            {/* um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
            <Reveal delay={120} className="mx-auto mt-14 max-w-[820px] text-center">
              <p className={`text-[13px] font-semibold uppercase tracking-[0.06em] ${DARK_MUTED}`}>
                {t("loop.metric", { time: loopTime })} · {t("loop.sampleTag")}
              </p>
              <div className="mt-6 flex items-end justify-center gap-6 sm:gap-12">
                <div>
                  <p className={`text-[14px] font-medium ${DARK_MUTED}`}>{t("loop.predicted")}</p>
                  <p className="mt-2 text-[72px] font-semibold leading-none tracking-[-0.06em] text-white/45 tabular-nums sm:text-[120px]">{loopSample.prediction.predicted}%</p>
                </div>
                <ArrowRight size={36} strokeWidth={1.5} aria-hidden="true" className="mb-6 shrink-0 text-white/30 sm:mb-10" />
                <div>
                  <p className="text-[14px] font-medium text-[#8fb0ff]">{t("loop.actual")}</p>
                  <p className="mt-2 bg-[linear-gradient(120deg,#8fb0ff,#4f7dff)] bg-clip-text text-[72px] font-semibold leading-none tracking-[-0.06em] text-transparent tabular-nums sm:text-[120px]">
                    {loopSample.prediction.actual}%
                  </p>
                </div>
              </div>
              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[14px]">
                <Check size={15} strokeWidth={2.5} aria-hidden="true" className="text-[#7fc48a]" />
                {t("loop.sampleVerdict", { diff: loopDiff })}
              </p>
            </Reveal>
            <div className="mx-auto mt-16 grid max-w-[980px] gap-8 sm:grid-cols-2">
              <p className="text-[17px] leading-relaxed">{t("loop.text1")}</p>
              <p className={`text-[17px] leading-relaxed ${DARK_MUTED}`}>{t("loop.text2")}</p>
            </div>
          </div>
        </section>

        {/* ---------- a oferta ---------- */}
        <section id="precos" className="scroll-mt-16 bg-paper">
          <div className="mx-auto max-w-[1200px] px-5 py-24 lg:px-8 lg:py-32">
            <PricingCards centered />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="bg-paper-raised">
          <div className="mx-auto max-w-[860px] px-5 py-24 lg:px-8 lg:py-28">
            <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
            <Reveal delay={120} className="mt-12 border-b border-line">
              {(["1", "2", "3"] as const).map((n) => (
                <details key={n} className="group border-t border-line py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[20px] font-semibold tracking-[-0.03em] sm:text-[22px]">
                    {t(`faq.q${n}`)}
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-[18px] font-normal transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-[64ch] text-[16.5px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------- escuro: o último convite ---------- */}
        <section className={`relative overflow-hidden ${DARK}`}>
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(79,125,255,0.35),transparent)]" />
          <Reveal className="relative mx-auto flex max-w-[860px] flex-col items-center px-5 py-28 text-center lg:py-36">
            <span className="grid h-24 w-24 place-items-center rounded-[28px] bg-white shadow-[0_20px_60px_-10px_rgba(79,125,255,0.6)]">
              <LogoMark size={56} />
            </span>
            <h2 className="mt-10 font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.05em] text-balance sm:text-[64px]">{t("final.title")}</h2>
            <p className={`mt-6 max-w-[52ch] text-[18px] leading-relaxed ${DARK_MUTED}`}>{t("final.lead")}</p>
            <Link href={tryHref} className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15.5px] font-semibold text-black transition-transform duration-150 hover:-translate-y-px hover:no-underline">
              {t("hero.cta")}
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <p className={`mt-3 text-[13px] ${DARK_MUTED}`}>{t("hero.ctaNote")}</p>
          </Reveal>
        </section>

        <footer className="border-t border-line bg-paper-raised">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-8">
            <div>
              <Logo size="sm" label={tCommon("brand")} />
              <p className="mt-4 max-w-[36ch] text-[13.5px] leading-relaxed text-ink-muted">{t("footer")}</p>
            </div>
            <nav aria-label={t("footerCols.product")}>
              <p className="text-[13px] font-semibold">{t("footerCols.product")}</p>
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
              <p className="text-[13px] font-semibold">{t("footerCols.company")}</p>
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
              <p className="text-[13px] font-semibold">{t("footerCols.legal")}</p>
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
          <div className="border-t border-line">
            <p className="mx-auto max-w-[1200px] px-5 py-5 text-[12.5px] text-ink-muted lg:px-8">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
