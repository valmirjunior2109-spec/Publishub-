import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { HeroProduct } from "@/components/landing/HeroProduct";
import { ProductTour } from "@/components/landing/ProductTour";
import { AppWindow, SectionHeader, SectionIndex } from "@/components/landing/Section";
import { buildTourSteps } from "@/components/landing/TourPanels";
import { PricingCards } from "@/components/PricingCards";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
  const w = await getTranslations("Landing.withYou");
  const who = await getTranslations("Landing.forWho");
  const s = await getTranslations("Landing.sections");
  const lines = c.raw("lines") as Line[];
  const notes = cp.raw("notes") as string[];
  const aiItems = w.raw("aiItems") as string[];
  const youItems = w.raw("youItems") as string[];
  const uses = who.raw("uses") as string[];
  const flow = t.raw("moments.steps") as { title: string; text: string }[];
  const problems = t.raw("problem.items") as { title: string; text: string }[];
  const facts = t.raw("facts.items") as { value: string; label: string }[];
  const tourSteps = await buildTourSteps(sample);
  const loopTime = formatTimestamp(loopSample.prediction.atSecond);
  const loopDiff = Math.round((loopSample.prediction.actual ?? 0) - loopSample.prediction.predicted);
  const locale = await getLocale();
  const tSeo = await getTranslations("Seo.home");
  const tPricing = await getTranslations("Pricing");
  const home = `${SITE_URL}${localePath(locale, "/")}`;
  const tryHref = localePath(locale, "/experimentar");

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
      offers: { "@type": "Offer", name: tPricing("planName"), price: OFFER.amount.toFixed(2), priceCurrency: OFFER.currency, url: `${SITE_URL}${localePath(locale, "/planos")}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (["1", "2", "3"] as const).map((n) => ({ "@type": "Question", name: t(`faq.q${n}`), acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`) } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- 01 · hero: a promessa, as duas ações e, logo abaixo, o produto ---------- */}
        <section className="container-page pb-20 pt-14 sm:pt-20 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-[920px] text-center">
            <Reveal eager>
              <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-[13px] font-medium text-ink-muted">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="truncate">{c("kicker")}</span>
              </p>
            </Reveal>
            <Reveal eager delay={40}>
              <h1 className="t-display mx-auto mt-7 max-w-[15ch] text-balance">{t("hero.title")}</h1>
            </Reveal>
            <Reveal eager delay={80}>
              <p className="t-lead mx-auto mt-6 max-w-[56ch]">{c("lead")}</p>
            </Reveal>
            <Reveal eager delay={120} className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href={tryHref} className={buttonClasses("primary", "md", "h-12 px-6 text-[15.5px]")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <Link href="#exemplo" className={buttonClasses("secondary", "md", "h-12 px-6 text-[15.5px]")}>
                {t("hero.secondary")}
              </Link>
            </Reveal>
            <Reveal eager delay={160}>
              <p className="mt-4 font-mono text-[12px] text-ink-muted">{t("hero.ctaNote")}</p>
            </Reveal>
          </div>

          <Reveal eager delay={200} className="mt-14 sm:mt-16 lg:mt-20">
            <HeroProduct sample={sample} />
          </Reveal>

          {/* para quem é: uma linha só, sem cartões */}
          <Reveal className="mt-12 flex flex-col items-center gap-4 sm:mt-14 lg:flex-row lg:justify-center lg:gap-8">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">{t("worksWith")}</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] font-medium text-ink sm:gap-x-8">
              {uses.map((use) => (
                <li key={use}>{use}</li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ---------- 02 · o produto: um passeio pelas quatro telas ---------- */}
        <section id="exemplo" className="section scroll-mt-16 border-t border-line bg-paper-raised">
          <div className="container-page">
            <SectionHeader index="02" label={s("product")} title={t("tour.title")} lead={t("tour.lead")} />
            <Reveal delay={80} className="mt-12 lg:mt-16">
              <ProductTour steps={tourSteps} label={s("product")} windowTitle={t("app.file")} />
            </Reveal>
          </div>
        </section>

        {/* ---------- 03 · o problema: três frases, sem números inventados ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <SectionHeader index="03" label={s("problem")} title={t("problem.title")} lead={t("problem.lead")} />
            <ol className="mt-14 grid border-t border-line md:grid-cols-3 lg:mt-20">
              {problems.map((item, index) => (
                <Reveal
                  as="li"
                  key={item.title}
                  delay={index * 60}
                  className={cn("border-b border-line py-8 md:border-b-0 md:py-10 md:pr-8", index > 0 && "md:border-l md:pl-8")}
                >
                  <span className="font-mono text-[12px] text-accent">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="t-h3 mt-4 max-w-[22ch]">{item.title}</h3>
                  <p className="mt-3 max-w-[40ch] text-[15.5px] leading-relaxed text-ink-muted">{item.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- 04 · como funciona: do upload ao post ---------- */}
        <section id="como-funciona" className="section scroll-mt-16 border-t border-line bg-paper-raised">
          <div className="container-page">
            <SectionHeader index="04" label={s("how")} title={t("moments.title")} />
            <ol className="mt-14 grid gap-x-8 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
              {flow.map((step, index) => {
                const yours = index === 4;
                return (
                  <Reveal as="li" key={step.title} delay={(index % 3) * 60} className={cn("border-t py-8", yours ? "border-accent" : "border-line")}>
                    <span className="flex items-center gap-3">
                      <span className={cn("font-mono text-[12px]", yours ? "text-accent" : "text-ink-muted")}>{String(index + 1).padStart(2, "0")}</span>
                      {yours && (
                        <Badge tone="accent" className="!py-0 !text-[11px]">
                          {w("youLabel")}
                        </Badge>
                      )}
                    </span>
                    <h3 className="t-h3 mt-4">{step.title}</h3>
                    <p className="mt-3 max-w-[38ch] text-[15.5px] leading-relaxed text-ink-muted">{step.text}</p>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ---------- 05 · a inteligência: as sete frentes e quem decide o quê ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <SectionHeader index="05" label={s("intelligence")} title={t("plan.title")} lead={t("plan.lead")} />
                <Reveal delay={80}>
                  <Link href={tryHref} className={buttonClasses("secondary", "md", "mt-8")}>
                    {t("plan.tileTitle")}
                    <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                  </Link>
                </Reveal>
              </div>
              <ol className="border-t border-line">
                {FRONTS.map((kind, index) => {
                  const { title, body } = splitItem(t(`plan.items.${kind}`));
                  return (
                    <Reveal as="li" key={kind} delay={(index % 4) * 40} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-b border-line py-6 sm:grid-cols-[56px_minmax(0,200px)_minmax(0,1fr)] sm:gap-x-6">
                      <span className="pt-1 font-mono text-[12px] text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h3>
                      {body && <p className="col-start-2 mt-1.5 text-[15px] leading-relaxed text-ink-muted first-letter:uppercase sm:col-start-3 sm:mt-0">{body}</p>}
                    </Reveal>
                  );
                })}
              </ol>
            </div>

            {/* quem faz o quê: o Publishub aponta, a decisão fica com quem fez o vídeo */}
            <div className="mt-24 lg:mt-32">
              <Reveal>
                <h3 className="t-h2 max-w-[18ch]">
                  {w("line1Start")}
                  <span className="text-accent">{w("line1Word")}</span>
                  {w("line1End")}
                  <span className="block text-ink-muted">
                    {w("line2Start")}
                    <span className="strike-cut [text-decoration-thickness:0.06em]">{w("line2Word")}</span>
                    {w("line2End")}
                  </span>
                </h3>
                <p className="t-lead mt-6 max-w-[60ch]">{w("lead")}</p>
              </Reveal>
              <Reveal delay={80} className="mt-12 overflow-hidden rounded-2xl border border-line bg-paper-raised">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="px-5 py-4 text-[14px] font-semibold sm:px-8">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                          {w("aiLabel")}
                        </span>
                      </th>
                      <th scope="col" className="border-l border-line px-5 py-4 text-[14px] font-semibold sm:px-8">
                        {w("youLabel")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiItems.map((item, index) => (
                      <tr key={item} className="border-b border-line last:border-b-0">
                        <td className="px-5 py-4 align-top text-[15px] text-ink-muted sm:px-8 sm:text-[16px]">{item}</td>
                        <td className="border-l border-line px-5 py-4 align-top text-[15px] font-medium sm:px-8 sm:text-[16px]">{youItems[index]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="flex items-center gap-2 border-t border-line bg-surface px-5 py-4 text-[14px] font-medium sm:px-8">
                  <Check size={15} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden="true" />
                  {w("note")}
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- 06 · a interface: a revisão como ela é, linha a linha ---------- */}
        <section className="section border-t border-line bg-paper-raised">
          <div className="container-page">
            <SectionHeader index="06" label={s("interface")} title={cp("title")} lead={cp("lead")} />
            <Reveal delay={80} className="mt-12 lg:mt-16">
              <AppWindow title={t("mock.window")} meta={<span className="hidden font-mono text-[12px] text-ink-muted sm:inline">{cp("decideSummary")}</span>} className="bg-paper">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0 p-5 sm:p-8">
                    <p className="t-label">{cp("watchLabel")}</p>
                    <ol className="mt-4">
                      {lines.map((line) => {
                        const out = line.mark === "cut" || line.mark === "drop";
                        return (
                          <li key={line.time} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[52px_minmax(0,1fr)_minmax(0,220px)] sm:items-baseline sm:gap-x-4">
                            <span className={cn("font-mono text-[12.5px]", line.mark === "drop" ? "text-accent" : "text-ink-muted")}>{line.time}</span>
                            <span className="text-[15.5px] leading-relaxed sm:text-[16px]">
                              <span className={out ? "strike-cut" : line.mark === "keep" ? "highlight-keep" : undefined}>{line.text}</span>
                            </span>
                            {line.note && (
                              <span className={cn("col-start-2 mt-1.5 text-[13px] leading-snug sm:col-start-3 sm:mt-0 sm:text-right", out ? "text-accent" : line.mark === "keep" ? "text-confirmed" : "text-ink-muted")}>
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
                            <span className="pt-0.5 font-mono text-[12px] text-ink-muted">{index + 1}</span>
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

        {/* ---------- 07 · resultados: o que dá para afirmar sem inventar números, e a previsão conferível ---------- */}
        <section className="section border-t border-line">
          <div className="container-page">
            <SectionHeader index="07" label={s("results")} title={t("facts.title")} />
            <dl className="mt-14 grid grid-cols-2 border-t border-line lg:mt-20 lg:grid-cols-4">
              {facts.map((fact, index) => (
                <Reveal key={fact.label} delay={index * 50} className={cn("border-b border-line py-8 pr-4 lg:border-b-0 lg:py-10", index % 2 === 1 && "border-l pl-5 sm:pl-8", index > 0 && "lg:border-l lg:pl-8")}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd className="font-display text-[44px] font-semibold leading-none tracking-[-0.045em] tabular-nums sm:text-[56px]">{fact.value}</dd>
                  <dd className="mt-3 max-w-[24ch] text-[14.5px] leading-snug text-ink-muted">{fact.label}</dd>
                </Reveal>
              ))}
            </dl>

            <div className="mt-20 grid items-center gap-12 lg:mt-28 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <p className="eyebrow">{t("loop.eyebrow")}</p>
                <h3 className="mt-4 font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] text-balance sm:text-[36px]">{t("loop.title")}</h3>
                <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed">{t("loop.text1")}</p>
                <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
              </Reveal>
              {/* um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
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
        </section>

        {/* ---------- 08 · a oferta ---------- */}
        <section id="precos" className="section scroll-mt-16 border-t border-line bg-paper-raised">
          <div className="container-page">
            <PricingCards eyebrow={<SectionIndex index="08" label={s("pricing")} />} />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="section border-t border-line">
          <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
            <SectionHeader label={s("faq")} title={t("faq.title")} />
            <Reveal delay={80} className="border-t border-line">
              {(["1", "2", "3"] as const).map((n) => (
                <details key={n} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-semibold tracking-[-0.02em] sm:text-[20px] [&::-webkit-details-marker]:hidden">
                    {t(`faq.q${n}`)}
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform duration-200 group-open:rotate-45">
                      <Plus size={15} strokeWidth={2} />
                    </span>
                  </summary>
                  <p className="-mt-1 max-w-[64ch] pb-6 text-[15.5px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------- 09 · o último convite ---------- */}
        <section className="container-page pb-20 lg:pb-28">
          <Reveal className="rounded-3xl border border-line bg-[#0a0a0b] px-6 py-16 text-center text-white sm:px-14 sm:py-24">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#f06aa4]">
              09 · {t("finalEyebrow")}
            </p>
            <h2 className="t-h2 mx-auto mt-5 max-w-[18ch] text-balance">{t("final.title")}</h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">{t("final.lead")}</p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href={tryHref} className={buttonClasses("primary", "md", "h-12 px-6 text-[15.5px]")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <Link
                href={localePath(locale, "/planos")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/15 px-6 text-[15.5px] font-semibold text-white transition-colors hover:bg-white/10 hover:no-underline"
              >
                {tPricing("planName")}
              </Link>
            </div>
            <p className="mt-5 font-mono text-[12px] text-white/50">{t("hero.ctaNote")}</p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
