import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight, Check, Plus } from "lucide-react";
import { Emphasis } from "@/components/landing/Emphasis";
import { FounderBand } from "@/components/landing/FounderBand";
import { HandNote } from "@/components/landing/HandNote";
import { HeroProduct } from "@/components/landing/HeroProduct";
import { LineSimulator, type SimItem } from "@/components/landing/LineSimulator";
import { MobileMore } from "@/components/landing/MobileMore";
import { MORE_HIDDEN } from "@/components/landing/mobileClasses";
import { MemoryShowcase } from "@/components/landing/MemoryShowcase";
import { ProductTour } from "@/components/landing/ProductTour";
import { SectionHeader, SectionIndex } from "@/components/landing/Section";
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
  const s = await getTranslations("Landing.sections");
  const lines = c.raw("lines") as Line[];
  const facts = t.raw("facts.items") as { value: string; label: string }[];
  // o simulador: três linhas do roteiro de exemplo (o gancho, a repetição, o fim), com a nota e a troca sugerida
  const simTabs = t.raw("sim.tabs") as string[];
  const simAlts = t.raw("sim.alts") as string[];
  const simItems: SimItem[] = [0, 5, 7].map((at, i) => ({ tab: simTabs[i], time: lines[at].time, line: lines[at].text, note: lines[at].note, alt: simAlts[i] }));
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
        {/* ---------- 01 · hero: um palco arredondado (o cabeçalho flutua dentro dele), a promessa, uma ação e o produto ---------- */}
        <section className="-mt-[68px] px-3 sm:-mt-[72px] sm:px-4 sm:pt-0">
          <div className="relative overflow-hidden rounded-[32px] border border-[var(--stage-line)] bg-[var(--stage)] pt-[68px] sm:rounded-[44px] sm:pt-[72px]">
            <div className="container-page pt-12 text-center sm:pt-20 lg:pt-24">
              <Reveal eager>
                <p className="chip">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
                  {t("hero.kicker")}
                </p>
              </Reveal>
              <Reveal eager delay={40}>
                <h1 className="t-display mx-auto mt-6 max-w-[17ch] text-balance">
                  {t("hero.title1")} <em>{t("hero.title2")}</em>
                </h1>
              </Reveal>
              <Reveal eager delay={80}>
                <p className="t-lead mx-auto mt-6 max-w-[52ch]">{t("hero.lead")}</p>
              </Reveal>
              <Reveal eager delay={120} className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-7">
                <TrackedLink where="hero" href={tryHref} className={buttonClasses("primary", "lg")}>
                  {t("hero.cta")}
                  <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                {/* a segunda ação é um link, não um segundo botão: o caminho principal fica um só */}
                <TrackedLink
                  where="hero_how"
                  href="#how-it-works"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 text-[15.5px] font-semibold text-ink underline decoration-[var(--stage-line)] decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink"
                >
                  {t("hero.secondary")}
                  <ArrowDown size={15} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
              </Reveal>
              <Reveal eager delay={160} className="mt-4">
                <p className="text-[13.5px] text-ink-muted">{t("hero.ctaNote")}</p>
              </Reveal>

              {/* o produto, cortado pela borda do palco; a nota à mão aponta o segundo da queda */}
              <Reveal eager delay={200} className="relative mx-auto mt-24 max-w-[1080px] text-left sm:mt-28">
                <HandNote arrow="down-left" className="absolute -top-[84px] right-1 sm:-top-[96px] sm:right-[30%] lg:right-[44%]">
                  {t("notes.hero")}
                </HandNote>
                <div className="-mb-20 sm:-mb-24">
                  <HeroProduct sample={sample} />
                </div>
              </Reveal>
            </div>
          </div>
          <p className="container-page mt-4 text-center text-[12.5px] leading-relaxed text-ink-muted">{t("hero.sampleNote")}</p>
        </section>

        {/* ---------- o resumo: um número grande e três fatos, sem inventar métrica ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <Reveal className="mx-auto max-w-[780px] text-center">
            <p className="font-serif text-[88px] font-medium leading-none tracking-[-0.04em] text-caramel-ink sm:text-[128px]" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
              {facts[0].value}
            </p>
            <h2 className="t-h2 mt-3 text-balance first-letter:uppercase">{facts[0].label}</h2>
            <p className="t-lead mx-auto mt-5 max-w-[48ch]">
              {t("worksWith")} {t("worksAlso")}
            </p>
          </Reveal>
          <dl className="mt-12 grid gap-4 sm:mt-14 sm:grid-cols-3">
            {facts.slice(1).map((fact, index) => (
              <Reveal key={fact.label} delay={index * 60} className="rounded-[28px] border border-line bg-paper-raised px-7 py-9 text-center">
                <dt className="sr-only">{fact.label}</dt>
                <dd className="font-serif text-[64px] font-medium leading-none tracking-[-0.03em] tabular-nums" style={{ fontVariationSettings: '"opsz" 144' }}>
                  {fact.value}
                </dd>
                <dd className="mx-auto mt-3 max-w-[22ch] text-[16px] leading-snug text-ink-muted first-letter:uppercase">{fact.label}</dd>
              </Reveal>
            ))}
          </dl>
          <Reveal className="mt-10 flex flex-col items-center gap-3">
            <TrackedLink where="facts" href={tryHref} className={buttonClasses("primary", "lg")}>
              {t("hero.cta")}
              <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
            </TrackedLink>
            <p className="text-[13.5px] text-ink-muted">{t("hero.ctaNote")}</p>
          </Reveal>
        </section>

        {/* ---------- 02 · o simulador: escolher uma linha do roteiro e ver a nota (exemplo rotulado) ---------- */}
        <section className="px-3 pt-20 sm:px-4 sm:pt-28">
          <div className="rounded-[32px] bg-[#1e1b18] px-5 py-16 text-center text-[#f6f0e4] sm:rounded-[44px] sm:px-10 sm:py-24 [&_em]:!text-[#e0a36f]">
            <Reveal className="mx-auto max-w-[760px]">
              <p className="chip !border-white/15 !bg-white/[0.06] !text-[#f6f0e4]/75">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
                {t("sim.kicker")}
              </p>
              <h2 className="t-h2 mt-5 text-balance">
                <Emphasis text={t("sim.title")} />
              </h2>
              <p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[#f6f0e4]/70 sm:text-[18px]">{t("sim.lead")}</p>
            </Reveal>
            <Reveal delay={80} className="relative mt-20 sm:mt-24">
              <HandNote arrow="down-left" className="absolute -top-[76px] right-[6%] !text-[#b9cbff] sm:-top-[88px] sm:right-[22%]">
                {t("notes.sim")}
              </HandNote>
              <LineSimulator items={simItems} label={t("sim.kicker")} labels={{ youSay: t("sim.youSay"), note: t("sim.note"), tryInstead: t("sim.tryInstead"), example: t("sim.example") }} />
            </Reveal>
            <Reveal className="mt-10 flex flex-col items-center gap-3">
              <TrackedLink where="simulator" href={tryHref} className={buttonClasses("primary", "lg", "!border-transparent !bg-[#f6f0e4] !text-[#1e1b18] hover:!bg-white")}>
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
              </TrackedLink>
              <p className="text-[13.5px] text-[#f6f0e4]/60">{t("hero.ctaNote")}</p>
            </Reveal>
          </div>
        </section>

        {/* ---------- 03 · por que ajuda: ganhos concretos e quem decide o quê ---------- */}
        <section className="section">
          <div className="container-page">
            <ValueSection index="03" label={s("value")} />
          </div>
        </section>

        {/* ---------- 04 · como funciona: as quatro telas, do upload ao vídeo pronto ---------- */}
        <section id="how-it-works" className="section scroll-mt-24">
          <div className="container-page">
            <SectionHeader index="04" label={s("how")} title={t("tour.title")} lead={t("tour.lead")} />
            <Reveal delay={80} className="mt-12 lg:mt-16">
              <ProductTour steps={tourSteps} label={s("product")} windowTitle={t("app.file")} />
            </Reveal>
            {/* viu como funciona: a ação logo ali, sem rolar até o fim */}
            <Reveal delay={80} className="mt-12 flex flex-col items-stretch gap-3 sm:items-center sm:text-center">
              <TrackedLink where="tour" href={tryHref} className={buttonClasses("primary", "lg")}>
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
              </TrackedLink>
              <p className="text-center text-[13.5px] text-ink-muted">{t("hero.ctaNote")}</p>
            </Reveal>
          </div>
        </section>

        {/* ---------- 05 · onde entra no trabalho: o arquivo de sempre, as notas, o editor de sempre ---------- */}
        <section className="section">
          <div className="container-page">
            <WorkflowSection index="05" label={s("workflow")} />
          </div>
        </section>

        {/* ---------- 06 · o que ele confere: as sete frentes ---------- */}
        <section className="section">
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
        <section className="section">
          <div className="container-page">
            <MemoryShowcase index="07" label={s("memory")} tryHref={tryHref} />
          </div>
        </section>

        {/* ---------- 08 · a aposta: o segundo da queda, conferível no Insights ---------- */}
        <section className="section">
          <div className="container-page">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <SectionIndex index="08" label={s("bet")} />
                <h2 className="t-h2 mt-5 text-balance">
                  <Emphasis text={t("loop.title")} />
                </h2>
                <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed">{t("loop.text1")}</p>
                <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-ink-muted max-lg:hidden">{t("loop.text2")}</p>
              </Reveal>
              <div className="flex flex-col gap-6">
                {/* primeiro: o segundo apostado e o do Insights, lado a lado (exemplo) */}
                <Reveal delay={60} className="rounded-[28px] border border-line bg-paper-raised p-6 sm:p-8">
                  <p className="sr-only">{t("loop.first.line", { time: dropTime })}</p>
                  <div className="flex items-center justify-end gap-3">
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div aria-hidden="true" className="mt-6 grid grid-cols-2 border-t border-line">
                    <div className="pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.first.weSaid")}</p>
                      <p className="mt-2 font-serif text-[48px] font-medium leading-none tracking-[-0.03em] tabular-nums sm:text-[52px]">{dropTime}</p>
                    </div>
                    <div className="border-l border-line pl-6 pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.first.insightsSays")}</p>
                      <p className="mt-2 font-serif text-[48px] font-medium leading-none tracking-[-0.03em] tabular-nums text-accent sm:text-[52px]">{dropTime}</p>
                    </div>
                  </div>
                  <p aria-hidden="true" className="mt-6 flex items-center gap-2 text-[15px] font-semibold">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.first.hit")}
                  </p>
                </Reveal>
                {/* depois: um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
                <p className="-mb-2 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">{t("loop.then")}</p>
                <Reveal delay={80} className="rounded-[28px] border border-line bg-paper-raised p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] text-ink-muted">{t("loop.metric", { time: loopTime })}</p>
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div className="mt-8 grid grid-cols-2 border-t border-line">
                    <div className="pt-6">
                      <p className="text-[14px] text-ink-muted">{t("loop.predicted")}</p>
                      <p className="mt-2 font-serif text-[56px] font-medium leading-none tracking-[-0.03em] tabular-nums sm:text-[64px]">{loopSample.prediction.predicted}%</p>
                    </div>
                    <div className="border-l border-line pl-6 pt-6">
                      <p className="text-[14px] text-ink-muted">{t("loop.actual")}</p>
                      <p className="mt-2 font-serif text-[56px] font-medium leading-none tracking-[-0.03em] tabular-nums text-accent sm:text-[64px]">{loopSample.prediction.actual}%</p>
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
        <section id="pricing" className="scroll-mt-24 px-3 sm:px-4">
          <div className="rounded-[32px] border border-line bg-paper-raised py-16 sm:rounded-[44px] sm:py-24">
            <div className="container-page">
              <PricingCards where="landing" eyebrow={<SectionIndex index="09" label={s("pricing")} />} />
            </div>
          </div>
        </section>

        {/* ---------- dúvidas: cada pergunta num cartão; à esquerda, o título e a ação ---------- */}
        <section id="faq" className="section scroll-mt-24">
          <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeader label={s("faq")} title={t("faq.title")} />
              <Reveal delay={80} className="mt-8 flex flex-col items-start gap-3">
                <TrackedLink where="faq" href={tryHref} className={buttonClasses("primary", "lg")}>
                  {t("hero.cta")}
                  <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                <p className="text-[13.5px] text-ink-muted">{t("hero.ctaNote")}</p>
              </Reveal>
            </div>
            <Reveal delay={80} className="flex flex-col gap-3">
              {FAQ.map((n) => (
                <details key={n} className="group rounded-[22px] border border-line bg-paper-raised px-5 transition-colors hover:border-[rgba(var(--ink-rgb),0.18)] sm:px-7">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-semibold tracking-[-0.015em] sm:text-[18px] [&::-webkit-details-marker]:hidden">
                    {t(`faq.q${n}`)}
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform duration-200 group-open:rotate-45 group-hover:text-ink">
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

        {/* ---------- 10 · o último convite: o mesmo palco do hero, uma ação só ---------- */}
        <section className="px-3 pb-6 sm:px-4 sm:pb-8">
          <Reveal className="rounded-[32px] border border-[var(--stage-line)] bg-[var(--stage)] px-6 py-20 text-center sm:rounded-[44px] sm:py-28">
            <p className="chip">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
              {t("finalEyebrow")}
            </p>
            <h2 className="t-display mx-auto mt-6 max-w-[15ch] text-balance">
              <Emphasis text={t("final.title")} />
            </h2>
            <p className="t-lead mx-auto mt-6 max-w-[52ch]">{t("final.lead")}</p>
            <div className="mt-10 flex flex-col items-center gap-3">
              <TrackedLink where="final" href={tryHref} className={buttonClasses("primary", "lg")}>
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
              </TrackedLink>
              <p className="text-[13.5px] text-ink-muted">{t("hero.ctaNote")}</p>
              <Link href={localePath(locale, "/pricing")} className="mt-2 text-[14.5px] font-semibold text-ink underline decoration-[var(--stage-line)] decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink">
                {tPricing("planName")}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
