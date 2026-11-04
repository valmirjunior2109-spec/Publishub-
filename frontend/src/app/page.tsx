import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight, Plus, Send, Settings2, UserRoundCheck, type LucideIcon } from "lucide-react";
import { Bento } from "@/components/landing/Bento";
import { BrandMark, EDITORS } from "@/components/landing/BrandMarks";
import { Emphasis } from "@/components/landing/Emphasis";
import { FounderBand } from "@/components/landing/FounderBand";
import { InViewPlay } from "@/components/landing/InViewPlay";
import { LineSimulator, type SimItem } from "@/components/landing/LineSimulator";
import { NotionPage, NotionTile, type NotionPageText } from "@/components/landing/NotionPage";
import { ProductDemo, type ProductDemoText } from "@/components/landing/ProductDemo";
import { HeroCollage, Scene } from "@/components/landing/Scenes";
import { SectionHeader, SectionIndex } from "@/components/landing/Section";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { PAID_PLANS, PLANS } from "@/lib/pricing";
import { jsonLd, ogImage, ORGANIZATION_ID, pageMetadata, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";
import { MAX_VIDEO_BYTES } from "@/lib/upload";

export function generateMetadata() {
  return pageMetadata("home", "/");
}

/* A landing usa uma análise de exemplo (fixture) como material visual. */
const sample = analyses[0];
/* O bloco da previsão mostra um ciclo fechado: esta é a única fixture com previsão e número real. */
const loopSample = analyses[1];

/* Poucas dúvidas, as de quem está decidindo: o que é, o que mandar, com que editor funciona, o que é
   grátis, o que acontece com o vídeo e se é assinatura. O resto das respostas mora em /pricing e nos guias. */
const FAQ = ["11", "1", "12", "4", "6", "3"] as const;

interface Line {
  time: string;
  text: string;
  mark: "cut" | "drop" | "keep" | "";
  /** o comentário do Publishub naquela linha (vazio: a linha passa sem comentário) */
  note: string;
}

/**
 * A home: a promessa e o produto funcionando; para quem é; o que ele faz, em cartões
 * animados; o Notion; onde entra no fluxo; o simulador; quem está construindo; poucas
 * dúvidas; e o convite final. As cores são as do logo, as ilustrações se mexem e a ação
 * principal aparece só três vezes.
 */
export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const c = await getTranslations("Landing.caderno");
  const s = await getTranslations("Landing.sections");
  const lines = c.raw("lines") as Line[];
  const plan = t.raw("hero.planItems") as { time: string; kind: string; text: string }[];
  const tNotion = await getTranslations("Analysis.notion");
  const tour = await getTranslations("Landing.tour");
  const tourSteps = tour.raw("steps") as { label: string }[];
  // o simulador: três linhas do roteiro de exemplo (o gancho, a repetição, o fim), com a nota e a troca sugerida
  const simTabs = t.raw("sim.tabs") as string[];
  const simAlts = t.raw("sim.alts") as string[];
  const simItems: SimItem[] = [0, 5, 7].map((at, i) => ({ tab: simTabs[i], time: lines[at].time, line: lines[at].text, note: lines[at].note, alt: simAlts[i] }));
  const loopTime = formatTimestamp(loopSample.prediction.atSecond);
  const dropTime = formatTimestamp(sample.dropAtSec);
  const lost = Math.round(sample.retention[sample.dropAtSec][1] - sample.retention[sample.dropAtSec + 2][1]);
  const notionPage: NotionPageText = {
    label: tNotion("label"),
    file: t("app.file"),
    example: t("mock.example"),
    dropAt: t("app.dropAt", { time: dropTime }),
    lost: t("app.lost", { lost }),
    quote: t("hero.samplePhrase"),
    plan: t("app.plan"),
    items: plan,
    cut: t("hero.art.cut"),
    cutRange: plan[0].time,
  };
  const demo: ProductDemoText = {
    window: t("mock.window"),
    file: t("app.file"),
    tabs: [tourSteps[0].label, tourSteps[1].label, tourSteps[2].label, tNotion("label")],
    drop: tour("upload.drop"),
    hint: tour("upload.hint"),
    uploaded: tour("upload.uploaded"),
    analyze: tour.raw("analyze") as string[],
    retention: t("app.retention"),
    dropAt: t("app.dropAt", { time: dropTime }),
    lost: t("app.lost", { lost }),
    said: t("app.said"),
    saidTime: formatTimestamp(sample.dropAtSec - 1),
    phrase: t("hero.samplePhrase"),
    plan: t("app.plan"),
    planCount: t("copilot.decideSummary"),
    items: plan,
    accept: t("hero.art.accept"),
    accepted: t("app.accepted"),
    finalEdit: t("copilot.finalEdit"),
    export: t("app.export"),
    notionTitle: tNotion("title"),
    notionConnected: tNotion("connected"),
    notionSend: tNotion("send"),
    notionPage,
    reel: { example: t("mock.example"), label: t("hero.reelLabel"), soundOn: t("hero.reelSoundOn"), soundOff: t("hero.reelSoundOff") },
  };
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
      // o grátis primeiro: é o preço que o Google mostra ao lado do nome ("Grátis")
      offers: [
        { "@type": "Offer", name: tPricing("free.name"), price: "0", priceCurrency: "USD", url: `${SITE_URL}${tryHref}` },
        ...PAID_PLANS.map((plan) => ({ "@type": "Offer", name: tPricing(`plans.${plan.id}.name`), price: plan.amount.toFixed(2), priceCurrency: plan.currency, url: `${SITE_URL}${localePath(locale, "/pricing")}` })),
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((n) => ({ "@type": "Question", name: t(`faq.q${n}`), acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`, { email: SUPPORT_EMAIL }) } })),
    },
  ];

  /* a ação principal, igual em toda a página: o botão e a frase curta embaixo */
  const cta = (where: string, align: "center" | "start" = "center", size: "md" | "lg" = "md") => (
    <div className={align === "center" ? "flex flex-col items-center gap-2" : "flex flex-col items-start gap-2"}>
      <TrackedLink where={where} href={tryHref} className={buttonClasses("primary", size)}>
        {t("hero.cta")}
        <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
      </TrackedLink>
      <p className="text-[13px] text-ink-muted">{t("hero.ctaNote")}</p>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- 1 · a promessa no centro, com as cenas animadas em volta, e o produto funcionando logo abaixo ---------- */}
        <section className="relative">
          <div className="relative xl:min-h-[720px]">
            <div className="relative z-10 mx-auto max-w-[780px] px-4 pt-14 text-center sm:px-6 sm:pt-20 xl:px-0 xl:pt-24">
              <Reveal eager>
                <p className="chip">{t("hero.kicker")}</p>
              </Reveal>
              <Reveal eager delay={40}>
                <h1 className="t-display mx-auto mt-5 max-w-[15ch] text-balance">
                  {t("hero.title1")} <em>{t("hero.title2")}</em>
                </h1>
              </Reveal>
              <Reveal eager delay={80}>
                <p className="t-lead mx-auto mt-6 max-w-[52ch]">{t("hero.lead")}</p>
              </Reveal>
              <Reveal eager delay={120} className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
                <TrackedLink where="hero" href={tryHref} className={buttonClasses("primary", "lg")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </TrackedLink>
                <TrackedLink where="hero_how" href="#how-it-works" className="inline-flex min-h-10 items-center justify-center gap-1.5 text-[14.5px] font-medium text-ink-muted transition-colors hover:text-ink hover:no-underline">
                  {t("hero.secondary")}
                  <ArrowDown size={15} strokeWidth={2} aria-hidden="true" />
                </TrackedLink>
              </Reveal>
              <Reveal eager delay={160} className="mt-3">
                <p className="text-[13px] text-ink-muted">{t("hero.ctaNote")}</p>
              </Reveal>
            </div>
            <HeroCollage />
          </div>
          <div className="relative mx-auto mt-12 max-w-[1200px] px-3 sm:mt-16 sm:px-6 lg:px-8 xl:mt-4">
            <Reveal eager delay={200}>
              <ProductDemo text={demo} points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} />
            </Reveal>
            <p className="mt-3 px-1 text-[12px] leading-relaxed text-ink-muted">{t("hero.sampleNote")}</p>
          </div>
        </section>

        {/* ---------- 2 · para quem é ---------- */}
        <section className="container-page pt-14 sm:pt-20">
          <Reveal>
            <p className="mx-auto max-w-[34ch] text-balance text-center font-serif text-[24px] leading-[1.25] tracking-[-0.012em] sm:text-[32px]">{t("worksWith")}</p>
            <p className="mx-auto mt-8 max-w-[52ch] text-balance text-center text-[14.5px] text-ink-muted">{t("worksAlso")}</p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-9 gap-y-4 text-ink-muted">
              {EDITORS.map(({ name, mark }) => (
                <li key={name} className="flex items-center gap-2 text-[16px] font-medium tracking-[-0.015em]">
                  {mark && <BrandMark name={mark} className="h-5 w-5" />}
                  {name}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ---------- 3 · o que o produto faz, em cartões animados ---------- */}
        <section className="container-page pt-14 sm:pt-20">
          <Reveal className="max-w-[760px]">
            <h2 className="t-h2 text-balance">
              <Emphasis text={t("value.title")} />
            </h2>
            <p className="t-lead mt-5 max-w-[60ch]">{t("value.lead")}</p>
          </Reveal>
          <div className="mt-10 sm:mt-14">
            <Bento loopSample={loopSample} loopTime={loopTime} />
          </div>
        </section>

        {/* ---------- 4 · o Notion: os três passos e a página se escrevendo ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <Reveal>
              <p className="chip">
                <NotionTile className="h-7 w-7 rounded-[8px]" />
                {tNotion("label")}
              </p>
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("notionTitle")} />
              </h2>
              <p className="t-lead mt-5 max-w-[50ch]">{tNotion("lead")}</p>
              <ol className="mt-7 flex flex-col gap-4">
                {[
                  { icon: UserRoundCheck, title: tNotion("connect"), text: tNotion("connectNote") },
                  { icon: Settings2, title: tNotion("chooseTitle"), text: `${tNotion("kindPage")} · ${tNotion("kindDatabase")}` },
                  { icon: Send, title: tNotion("send") },
                ].map(({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) => (
                  <li key={title} className={cn("flex gap-3.5", text ? "items-start" : "items-center")}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-caramel-ink">
                      <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium tracking-[-0.015em]">{title}</span>
                      {text && <span className="mt-0.5 block text-[14px] leading-snug text-ink-muted">{text}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={80}>
              <InViewPlay className="tile tile-clay rounded-[14px] p-5 sm:p-10">
                <NotionPage text={notionPage} mode="loop" />
              </InViewPlay>
            </Reveal>
          </div>
        </section>

        {/* ---------- 5 · onde a publishub entra, sem plugin nem editor novo: o título à esquerda, o texto à direita ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <Reveal className="grid gap-5 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionIndex label={s("workflow")} />
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("workflow.title")} />
              </h2>
            </div>
            <div className="lg:pt-9">
              <p className="t-lead max-w-[50ch]">{t("workflow.lead")}</p>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{t("workflow.back.text")}</p>
              <p className="mt-6 font-mono text-[13px] text-ink-muted">MP4 · MOV · WEBM · ≤ {MAX_VIDEO_BYTES / 1024 / 1024} MB</p>
            </div>
          </Reveal>
        </section>

        {/* ---------- 6 · o simulador (é o "How it works" do menu): escolher uma linha e ver a nota ---------- */}
        <section id="how-it-works" className="container-page scroll-mt-20 pt-20 sm:pt-28">
          <div className="rounded-[14px] bg-surface px-4 py-14 sm:px-8 sm:py-20">
            <Reveal className="mx-auto max-w-[720px] text-center">
              <p className="chip">{t("sim.kicker")}</p>
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("sim.title")} />
              </h2>
              <p className="t-lead mx-auto mt-5 max-w-[54ch]">{t("sim.lead")}</p>
            </Reveal>
            <Reveal delay={80} className="mt-10">
              <LineSimulator items={simItems} label={t("sim.kicker")} labels={{ youSay: t("sim.youSay"), note: t("sim.note"), tryInstead: t("sim.tryInstead"), example: t("sim.example") }} />
            </Reveal>
            <Reveal className="mt-8">{cta("simulator")}</Reveal>
          </div>
        </section>

        {/* ---------- 7 · quem está construindo: texto e foto ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <FounderBand />
        </section>

        {/* ---------- 8 · poucas dúvidas, em linhas finas; à esquerda, o título ---------- */}
        <section id="faq" className="container-page scroll-mt-20 pt-20 sm:pt-28">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionHeader label={s("faq")} title={t("faq.title")} />
            </div>
            <Reveal delay={80} className="border-b border-line">
              {FAQ.map((n) => (
                <details key={n} className="group border-t border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-medium tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                    {t(`faq.q${n}`)}
                    <Plus size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-200 ease-out group-open:rotate-45" />
                  </summary>
                  <p className="fade-in max-w-[62ch] pb-6 text-[15px] leading-relaxed text-ink-muted">{t(`faq.a${n}`, { email: SUPPORT_EMAIL })}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------- 9 · o convite final, sobre a mesma fita: uma frase, o botão e o preço ---------- */}
        <section className="container-page pb-16 pt-20 sm:pb-24 sm:pt-28">
          <Reveal className="tile tile-clay relative overflow-hidden rounded-[14px] px-6 py-16 text-center sm:px-10 sm:py-24">
            <InViewPlay className="pointer-events-none absolute inset-0 hidden lg:block">
              <Scene name="notebook" className="drift absolute -left-6 top-12 h-[150px] w-[150px]" />
              <Scene name="wave" className="drift absolute -right-6 bottom-12 h-[150px] w-[150px] [animation-delay:-4s]" />
            </InViewPlay>
            <div className="relative mx-auto max-w-[860px]">
              <h2 className="t-display text-balance">
                <Emphasis text={`${t("final.readThisFar")} ${t("final.title")}`} />
              </h2>
              <p className="t-lead mx-auto mt-6 max-w-[54ch]">{t("final.lead")}</p>
              <div className="mt-8 flex flex-col items-center gap-2">
                <TrackedLink where="final" href={tryHref} className={buttonClasses("primary", "lg", "!bg-[#1e1b18] !text-[#fbf3e6] hover:!bg-[#33302b]")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                <p className="text-[13px] text-ink-muted">{t("hero.ctaNote")}</p>
                <Link href={localePath(locale, "/pricing")} className="mt-1 inline-flex min-h-10 items-center text-[14px] font-medium text-ink underline-offset-4 hover:underline">
                  {tPricing("fromPrice", { price: PLANS.creator.display })}
                </Link>
                {/* o risco de pagar, desfeito ao lado do preço: a mesma garantia dos cartões de /pricing */}
                <p className="text-[13px] text-ink-muted">{tPricing("guarantee")}</p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
