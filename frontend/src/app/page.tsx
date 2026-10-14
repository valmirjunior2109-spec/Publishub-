import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { FounderBand } from "@/components/landing/FounderBand";
import { HeroProduct } from "@/components/landing/HeroProduct";
import { MobileMore } from "@/components/landing/MobileMore";
import { MORE_HIDDEN } from "@/components/landing/mobileClasses";
import { MemoryShowcase } from "@/components/landing/MemoryShowcase";
import { ProductTour } from "@/components/landing/ProductTour";
import { AppWindow, SectionHeader, SectionIndex } from "@/components/landing/Section";
import { buildTourSteps } from "@/components/landing/TourPanels";
import { ValueSection } from "@/components/landing/ValueSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PricingCards } from "@/components/PricingCards";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackedLink } from "@/components/TrackedLink";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { OFFER } from "@/lib/pricing";
import { jsonLd, ogImage, ORGANIZATION_ID, pageMetadata, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";

export function generateMetadata() {
  return pageMetadata("home", "/");
}

/* A landing usa uma análise de exemplo (fixture) como material visual. */
const sample = analyses[0];
/* O bloco da previsão mostra um ciclo fechado: esta é a única fixture com previsão e número real. */
const loopSample = analyses[1];

const FRONTS = ["hook", "cut", "pacing", "broll", "caption", "structure", "cta"] as const;

/* As dúvidas, na ordem de quem está decidindo: o que é, o que mandar, com que editor funciona, se troca o
   editor, o que é grátis, por que não um chat, se vale, se serve para o nicho; depois privacidade, garantia,
   TikTok e assinatura. */
const FAQ = ["11", "1", "12", "5", "4", "7", "8", "9", "6", "10", "2", "3"] as const;

/* "Gancho: o que dizer…" → título e descrição, nos três idiomas. */
function splitItem(text: string): { title: string; body: string } {
  const at = text.indexOf(":");
  return at > 0 ? { title: text.slice(0, at), body: text.slice(at + 1).trim() } : { title: text, body: "" };
}

interface Line {
  time: string;
  text: string;
  mark: "cut" | "drop" | "keep" | "";
  /** o comentário do Publishub naquela linha (vazio: a linha passa sem comentário) */
  note: string;
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const c = await getTranslations("Landing.caderno");
  const cp = await getTranslations("Landing.copilot");
  const s = await getTranslations("Landing.sections");
  const lines = c.raw("lines") as Line[];
  const notes = cp.raw("notes") as string[];
  const facts = t.raw("facts.items") as { value: string; label: string }[];
  const tourSteps = await buildTourSteps(sample);
  const loopTime = formatTimestamp(loopSample.prediction.atSecond);
  const dropTime = formatTimestamp(sample.dropAtSec);
  const loopDiff = Math.round((loopSample.prediction.actual ?? 0) - loopSample.prediction.predicted);
  const locale = await getLocale();
  const tSeo = await getTranslations("Seo.home");
  const tPricing = await getTranslations("Pricing");
  const home = `${SITE_URL}${localePath(locale, "/")}`;
  const tryHref = localePath(locale, "/try");

  // o que o Google lê sobre o produto: quem faz, o que é, quanto custa e as dúvidas da página
  const structured = [
    { "@context": "https://schema.org", "@type": "Organization", "@id": ORGANIZATION_ID, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg`, email: SUPPORT_EMAIL },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": WEBSITE_ID, name: SITE_NAME, url: home, inLanguage: locale, publisher: { "@id": ORGANIZATION_ID } },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: home,
      description: tSeo("description"),
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      inLanguage: locale,
      image: `${SITE_URL}${ogImage(locale)}`,
      publisher: { "@id": ORGANIZATION_ID },
      offers: { "@type": "Offer", name: tPricing("planName"), price: OFFER.amount.toFixed(2), priceCurrency: OFFER.currency, url: `${SITE_URL}${localePath(locale, "/pricing")}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((n) => ({ "@type": "Question", name: t(`faq.q${n}`), acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`, { email: SUPPORT_EMAIL }) } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- 01 · hero: a promessa à esquerda, o que fazer agora à direita e, embaixo, o produto ---------- */}
        <section className="container-page pb-16 pt-10 sm:pt-16 lg:pb-24 lg:pt-20">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
            <div>
              <Reveal eager>
                <p className="flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-caramel" />
                  {t("hero.kicker")}
                </p>
              </Reveal>
              <Reveal eager delay={40}>
                <h1 className="t-display mt-6 max-w-[16ch] text-balance lg:text-[68px] xl:text-[76px]">
                  {t("hero.title1")} <span className="marker-caramel">{t("hero.title2")}</span>
                </h1>
              </Reveal>
            </div>
            <div className="lg:pb-2">
              <Reveal eager delay={80}>
                <p className="t-lead max-w-[46ch]">{t("hero.lead")}</p>
              </Reveal>
              <Reveal eager delay={120} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <TrackedLink where="hero" href={tryHref} className={buttonClasses("primary", "md", "h-12 px-6 text-[15.5px]")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                {/* a segunda ação é um link, não um segundo botão: o caminho principal fica um só */}
                <TrackedLink
                  where="hero_how"
                  href="#how-it-works"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 text-[15px] font-semibold text-ink underline decoration-line decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink"
                >
                  {t("hero.secondary")}
                  <ArrowDown size={15} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
              </Reveal>
              <Reveal eager delay={160}>
                <p className="mt-4 font-mono text-[12px] text-ink-muted max-sm:text-center">{t("hero.ctaNote")}</p>
              </Reveal>
            </div>
          </div>

          <Reveal eager delay={200} className="mt-12 sm:mt-14 lg:mt-16">
            <HeroProduct sample={sample} />
            <p className="mt-3 max-w-[90ch] text-[12.5px] leading-relaxed text-ink-muted">{t("hero.sampleNote")}</p>
          </Reveal>

          {/* para quem é, e o que dá para afirmar sem inventar números */}
          <div className="mt-12 grid gap-8 border-t border-line pt-8 sm:mt-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:gap-12">
            <Reveal>
              <p className="max-w-[30ch] text-[17px] font-semibold leading-snug tracking-[-0.015em] text-balance">{t("worksWith")}</p>
              <p className="mt-2 text-[14px] text-ink-muted">{t("worksAlso")}</p>
            </Reveal>
            <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
              {facts.map((fact, index) => (
                <Reveal key={fact.label} delay={index * 50} className={cn("pr-4", index % 2 === 1 && "border-l border-line pl-5", index > 0 && "sm:border-l sm:pl-5")}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[36px]">{fact.value}</dd>
                  <dd className="mt-2 max-w-[20ch] text-[13.5px] leading-snug text-ink-muted">{fact.label}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- 02 · o produto em ação: a revisão como ela é, linha a linha (exemplo rotulado) ---------- */}
        <section className="section border-t border-line bg-paper-raised">
          <div className="container-page">
            <SectionHeader index="02" label={s("interface")} title={cp("title")} lead={cp("lead")} />
            <Reveal delay={80} className="mt-12 lg:mt-16">
              <AppWindow
                title={t("mock.window")}
                meta={
                  <span className="flex items-center gap-3">
                    <span className="hidden font-mono text-[12px] text-ink-muted md:inline">{cp("decideSummary")}</span>
                    <Badge>{t("mock.example")}</Badge>
                  </span>
                }
                className="bg-paper"
              >
                <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0 p-5 sm:p-8">
                    <p className="t-label">{cp("watchLabel")}</p>
                    <ol className="mt-4">
                      {lines.map((line) => {
                        const out = line.mark === "cut" || line.mark === "drop";
                        return (
                          <li key={line.time} className={cn("grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[52px_minmax(0,1fr)_minmax(0,220px)] sm:items-baseline sm:gap-x-4", !line.note && "max-lg:hidden")}>
                            <span className={cn("font-mono text-[12.5px]", line.mark === "drop" ? "text-accent" : "text-ink-muted")}>{line.time}</span>
                            <span className="text-[15.5px] leading-relaxed sm:text-[16px]">
                              <span className={out ? "strike-cut" : line.mark === "keep" ? "highlight-keep" : undefined}>{line.text}</span>
                            </span>
                            {line.note && (
                              <span className={cn("col-start-2 mt-1.5 text-[13px] leading-snug sm:col-start-3 sm:mt-0 sm:text-right", out ? "text-accent" : line.mark === "keep" ? "text-confirmed" : "text-caramel-ink")}>
                                {line.note}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  <aside className="flex flex-col gap-6 border-t border-line bg-paper-raised p-5 sm:p-8 lg:border-l lg:border-t-0">
                    <div>
                      <p className="t-label">{cp("notesLabel")}</p>
                      <ol className="mt-4 flex flex-col gap-3">
                        {notes.map((note, index) => (
                          <li key={note} className="flex gap-3 text-[15px] leading-snug">
                            <span className="pt-0.5 font-mono text-[12px] text-caramel-ink">{index + 1}</span>
                            {note}
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="mt-auto rounded-xl border border-line bg-paper p-5">
                      <p className="t-label">{cp("decideLabel")}</p>
                      <p className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">{cp("decideSummary")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="accent">
                          <Check size={12} strokeWidth={3} aria-hidden="true" />
                          {cp("accepted")}
                        </Badge>
                        <Badge>
                          <Minus size={12} strokeWidth={3} aria-hidden="true" />
                          {cp("skipped")}
                        </Badge>
                      </div>
                      <p className="mt-4 font-mono text-[12px] text-ink-muted">{cp("finalEdit")}</p>
                    </div>
                  </aside>
                </div>
              </AppWindow>
            </Reveal>
          </div>
        </section>

        {/* ---------- 03 · por que ajuda: ganhos concretos e quem decide o quê ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <ValueSection index="03" label={s("value")} />
          </div>
        </section>

        {/* ---------- 04 · como funciona: as quatro telas, do upload ao vídeo pronto ---------- */}
        <section id="how-it-works" className="section scroll-mt-16 border-t border-line bg-paper-raised">
          <div className="container-page">
            <SectionHeader index="04" label={s("how")} title={t("tour.title")} lead={t("tour.lead")} />
            <Reveal delay={80} className="mt-12 lg:mt-16">
              <ProductTour steps={tourSteps} label={s("product")} windowTitle={t("app.file")} />
            </Reveal>
            {/* viu como funciona: a ação logo ali, sem rolar até o fim */}
            <Reveal delay={80} className="mt-12 flex flex-col items-stretch gap-3 sm:items-center sm:text-center">
              <TrackedLink where="tour" href={tryHref} className={buttonClasses("primary", "md", "h-12 px-6 text-[15.5px]")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </TrackedLink>
              <p className="text-center font-mono text-[12px] text-ink-muted">{t("hero.ctaNote")}</p>
            </Reveal>
          </div>
        </section>

        {/* ---------- 05 · onde entra no trabalho: o arquivo de sempre, as notas, o editor de sempre ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <WorkflowSection index="05" label={s("workflow")} />
          </div>
        </section>

        {/* ---------- 06 · o que ele confere: as sete frentes ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <SectionHeader index="06" label={s("intelligence")} title={t("plan.title")} lead={t("plan.lead")} />
              </div>
              <MobileMore>
                <ol className="border-t border-line">
                  {FRONTS.map((kind, index) => {
                    const { title, body } = splitItem(t(`plan.items.${kind}`));
                    return (
                      <Reveal as="li" key={kind} delay={(index % 4) * 40} className={cn("grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-b border-line py-5 sm:grid-cols-[56px_minmax(0,200px)_minmax(0,1fr)] sm:gap-x-6 sm:py-6", index >= 3 && MORE_HIDDEN)}>
                        <span className="pt-1 font-mono text-[12px] text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                        <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h3>
                        {body && <p className="col-start-2 mt-1.5 text-[15px] leading-relaxed text-ink-muted first-letter:uppercase sm:col-start-3 sm:mt-0">{body}</p>}
                      </Reveal>
                    );
                  })}
                </ol>
              </MobileMore>
            </div>
          </div>
        </section>

        {/* ---------- 07 · a memória: quanto mais a pessoa usa, mais a publishub edita do jeito dela ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <MemoryShowcase index="07" label={s("memory")} tryHref={tryHref} />
          </div>
        </section>

        {/* ---------- 08 · a aposta: o segundo da queda, conferível no Insights ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <SectionIndex index="08" label={s("bet")} />
                <h2 className="t-h2 mt-4 text-balance">{t("loop.title")}</h2>
                <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed">{t("loop.text1")}</p>
                <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-ink-muted max-lg:hidden">{t("loop.text2")}</p>
              </Reveal>
              <div className="flex flex-col gap-6">
                {/* primeiro: o segundo apostado e o do Insights, lado a lado (exemplo) */}
                <Reveal delay={60} className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
                  <p className="sr-only">{t("loop.first.line", { time: dropTime })}</p>
                  <div className="flex items-center justify-end gap-3">
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div aria-hidden="true" className="mt-6 grid grid-cols-2 border-t border-line">
                    <div className="pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.first.weSaid")}</p>
                      <p className="mt-2 font-display text-[44px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[52px]">{dropTime}</p>
                    </div>
                    <div className="border-l border-line pl-6 pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.first.insightsSays")}</p>
                      <p className="mt-2 font-display text-[44px] font-semibold leading-none tracking-[-0.05em] tabular-nums text-accent sm:text-[52px]">{dropTime}</p>
                    </div>
                  </div>
                  <p aria-hidden="true" className="mt-6 flex items-center gap-2 text-[15px] font-semibold">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.first.hit")}
                  </p>
                </Reveal>
                {/* depois: um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
                <p className="-mb-2 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">{t("loop.then")}</p>
                <Reveal delay={80} className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] text-ink-muted">{t("loop.metric", { time: loopTime })}</p>
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div className="mt-8 grid grid-cols-2 border-t border-line">
                    <div className="pt-6">
                      <p className="text-[14px] text-ink-muted">{t("loop.predicted")}</p>
                      <p className="mt-2 font-display text-[52px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[64px]">{loopSample.prediction.predicted}%</p>
                    </div>
                    <div className="border-l border-line pl-6 pt-6">
                      <p className="text-[14px] text-ink-muted">{t("loop.actual")}</p>
                      <p className="mt-2 font-display text-[52px] font-semibold leading-none tracking-[-0.05em] tabular-nums text-accent sm:text-[64px]">{loopSample.prediction.actual}%</p>
                    </div>
                  </div>
                  <p className="mt-8 flex items-center gap-2 text-[14.5px] font-medium">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.sampleVerdict", { diff: loopDiff })}
                  </p>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 09 · a oferta: o grátis e o Vitalício Fundador, lado a lado, com a garantia ---------- */}
        <section id="pricing" className="section scroll-mt-16 border-t border-line bg-paper-raised">
          <div className="container-page">
            <PricingCards where="landing" eyebrow={<SectionIndex index="09" label={s("pricing")} />} />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section id="faq" className="section scroll-mt-16 border-t border-line">
          <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeader label={s("faq")} title={t("faq.title")} />
            </div>
            <Reveal delay={80} className="border-t border-line">
              {FAQ.map((n) => (
                <details key={n} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-semibold tracking-[-0.02em] sm:py-6 sm:text-[19px] [&::-webkit-details-marker]:hidden">
                    {t(`faq.q${n}`)}
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform duration-200 group-open:rotate-45 group-hover:border-[rgba(var(--ink-rgb),0.25)] group-hover:text-ink">
                      <Plus size={15} strokeWidth={2} />
                    </span>
                  </summary>
                  <p className="-mt-1 max-w-[64ch] pb-6 text-[15.5px] leading-relaxed text-ink-muted">{t(`faq.a${n}`, { email: SUPPORT_EMAIL })}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------- quem está construindo: o fundador, em primeira pessoa ---------- */}
        <section className="container-page pb-14 sm:pb-20 lg:pb-24">
          <FounderBand />
        </section>

        {/* ---------- 10 · o último convite: uma ação só ---------- */}
        <section className="container-page pb-20 lg:pb-28">
          <Reveal className="rounded-3xl border border-line bg-[#1e1b18] px-6 py-16 text-center text-[#f6f0e4] sm:px-14 sm:py-24">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#e0a36f]">
              10 · {t("finalEyebrow")}
            </p>
            <h2 className="t-h2 mx-auto mt-5 max-w-[18ch] text-balance">{t("final.title")}</h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-relaxed text-[#f6f0e4]/70 sm:text-[18px]">{t("final.lead")}</p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-6">
              <TrackedLink where="final" href={tryHref} className={buttonClasses("primary", "md", "h-12 px-6 text-[15.5px]")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </TrackedLink>
              <Link
                href={localePath(locale, "/pricing")}
                className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold text-[#f6f0e4] underline decoration-[#f6f0e4]/30 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f6f0e4]"
              >
                {tPricing("planName")}
              </Link>
            </div>
            <p className="mt-5 font-mono text-[12px] text-[#f6f0e4]/60">{t("hero.ctaNote")}</p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
