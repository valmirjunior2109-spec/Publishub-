import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlarmClock, ArrowDown, ArrowRight, Check, Crosshair, Lightbulb, PenLine, Plus } from "lucide-react";
import { Emphasis } from "@/components/landing/Emphasis";
import { FounderBand } from "@/components/landing/FounderBand";
import { HandNote } from "@/components/landing/HandNote";
import { HeroProduct } from "@/components/landing/HeroProduct";
import { HERO_REEL_POSTER } from "@/components/landing/heroReelMedia";
import { LineSimulator, type SimItem } from "@/components/landing/LineSimulator";
import { SectionHeader, SectionIndex } from "@/components/landing/Section";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackedLink } from "@/components/TrackedLink";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { PAID_PLANS, PLANS } from "@/lib/pricing";
import { jsonLd, ogImage, ORGANIZATION_ID, pageMetadata, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";

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

/* Os quatro ganhos, cada um com o seu ícone (a ordem é a de Landing.value.items). */
const VALUE_ICONS = [Crosshair, Lightbulb, AlarmClock, PenLine];

/* Os editores de onde o vídeo costuma sair: só nomes, sem logo. A publishub não se conecta a nenhum deles. */
const EDITORS = ["CapCut", "Premiere Pro", "DaVinci Resolve", "InShot"];

interface Line {
  time: string;
  text: string;
  mark: "cut" | "drop" | "keep" | "";
  /** o comentário do Publishub naquela linha (vazio: a linha passa sem comentário) */
  note: string;
}

/**
 * A home, na estrutura do abacatepay.com: hero com o produto; um número grande e quatro
 * cartões; duas seções divididas (imagem e texto, depois texto e imagem); o simulador
 * numa seção escura; quem está construindo; poucas dúvidas; e o convite final.
 */
export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const c = await getTranslations("Landing.caderno");
  const s = await getTranslations("Landing.sections");
  const lines = c.raw("lines") as Line[];
  const facts = t.raw("facts.items") as { value: string; label: string }[];
  const values = t.raw("value.items") as { title: string; text: string }[];
  // o simulador: três linhas do roteiro de exemplo (o gancho, a repetição, o fim), com a nota e a troca sugerida
  const simTabs = t.raw("sim.tabs") as string[];
  const simAlts = t.raw("sim.alts") as string[];
  const simItems: SimItem[] = [0, 5, 7].map((at, i) => ({ tab: simTabs[i], time: lines[at].time, line: lines[at].text, note: lines[at].note, alt: simAlts[i] }));
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
      offers: PAID_PLANS.map((plan) => ({ "@type": "Offer", name: tPricing(`plans.${plan.id}.name`), price: plan.amount.toFixed(2), priceCurrency: plan.currency, url: `${SITE_URL}${localePath(locale, "/pricing")}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((n) => ({ "@type": "Question", name: t(`faq.q${n}`), acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`, { email: SUPPORT_EMAIL }) } })),
    },
  ];

  /* a ação principal, igual em toda a página: o botão e a frase curta embaixo */
  const cta = (where: string, align: "center" | "start" = "center") => (
    <div className={align === "center" ? "flex flex-col items-center gap-3" : "flex flex-col items-start gap-3"}>
      <TrackedLink where={where} href={tryHref} className={buttonClasses("primary", "lg")}>
        {t("hero.cta")}
        <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
      </TrackedLink>
      <p className="text-[13.5px] text-ink-muted">{t("hero.ctaNote")}</p>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- 1 · hero: um palco arredondado (o cabeçalho flutua dentro dele), a promessa, uma ação e o produto ---------- */}
        <section className="-mt-[68px] px-3 sm:-mt-[72px] sm:px-4">
          <div className="relative overflow-hidden rounded-[32px] border border-[var(--stage-line)] bg-[var(--stage)] pt-[68px] sm:rounded-[44px] sm:pt-[72px]">
            <div className="container-page pb-8 pt-12 text-center sm:pb-14 sm:pt-20 lg:pb-16 lg:pt-24">
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

              {/* o produto, inteiro dentro do palco (cortado pela borda, parecia quebrado); a nota à mão aponta o segundo da queda */}
              <Reveal eager delay={200} className="relative mx-auto mt-24 max-w-[1080px] text-left sm:mt-28">
                <HandNote arrow="down-left" className="absolute -top-[84px] right-1 sm:-top-[96px] sm:right-[30%] lg:right-[44%]">
                  {t("notes.hero")}
                </HandNote>
                <HeroProduct sample={sample} />
              </Reveal>
            </div>
          </div>
          <p className="container-page mt-4 text-center text-[12.5px] leading-relaxed text-ink-muted">{t("hero.sampleNote")}</p>
        </section>

        {/* ---------- 2 · um número grande e quatro cartões: o que muda, em uma linha cada ---------- */}
        <section className="container-page pt-20 sm:pt-32">
          <Reveal className="mx-auto max-w-[780px] text-center">
            <p className="font-serif text-[88px] font-medium leading-none tracking-[-0.04em] text-caramel-ink sm:text-[128px]" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
              {facts[0].value}
            </p>
            <h2 className="t-h2 mt-3 text-balance first-letter:uppercase">{facts[0].label}</h2>
            <p className="t-lead mx-auto mt-5 max-w-[48ch]">
              {t("worksWith")} {t("worksAlso")}
            </p>
          </Reveal>
          <ul className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item, index) => {
              const Icon = VALUE_ICONS[index] ?? Check;
              return (
                <Reveal as="li" key={item.title} delay={index * 60} className="flex flex-col items-center rounded-[28px] border border-line bg-paper-raised px-6 pb-8 pt-9 text-center">
                  <span aria-hidden="true" className="grid h-[72px] w-[72px] place-items-center rounded-[22px] bg-[var(--stage)] text-caramel-ink">
                    <Icon size={32} strokeWidth={1.6} />
                  </span>
                  <h3 className="mt-6 text-[18px] font-semibold leading-snug tracking-[-0.015em] text-balance">{item.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{item.text}</p>
                </Reveal>
              );
            })}
          </ul>
          <Reveal className="mt-12">{cta("facts")}</Reveal>
        </section>

        {/* ---------- 3 · imagem e texto: onde a publishub entra, sem plugin nem editor novo ---------- */}
        <section className="container-page pt-24 sm:pt-36">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* o vídeo sai do editor de sempre: o Reel no celular e, embaixo, os apps de onde ele costuma vir */}
            <Reveal className="relative">
              <div className="relative mx-auto flex max-w-[520px] justify-center overflow-hidden rounded-[32px] border border-[var(--stage-line)] bg-[var(--stage)] px-8 pb-36 pt-12 sm:rounded-[40px] sm:pb-24">
                <div className="relative w-[230px] rounded-[38px] border-[7px] border-[#1e1b18] bg-[#1e1b18] shadow-window sm:w-[250px]">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[31px]">
                    <Image src={HERO_REEL_POSTER} alt={t("hero.posterAlt")} fill sizes="250px" className="object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-medium text-white">{t("mock.example")}</span>
                    <span className="absolute inset-x-3 bottom-4 rounded-2xl bg-[#fffdf8]/95 px-3.5 py-3 text-left shadow-float">
                      <span className="block font-mono text-[11px] text-[#8a4f22]">{lines[0].time}</span>
                      <span className="hand mt-0.5 block text-[22px] first-letter:uppercase">{lines[0].note}</span>
                    </span>
                  </div>
                </div>
                <ul className="absolute inset-x-0 bottom-7 flex flex-wrap justify-center gap-2 px-6">
                  {EDITORS.map((name) => (
                    <li key={name} className="rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-[13px] font-semibold text-ink shadow-card">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <SectionIndex label={s("workflow")} />
              <h2 className="t-h2 mt-5 text-balance">
                <Emphasis text={t("workflow.title")} />
              </h2>
              <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-ink-muted">{t("workflow.lead")}</p>
              <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-ink-muted">{t("workflow.back.text")}</p>
              {/* os formatos, num campo como o de copiar: é tudo o que a pessoa precisa saber para começar */}
              <p className="mt-7 inline-flex max-w-full items-center gap-3 rounded-2xl border border-dashed border-line bg-paper-raised px-4 py-3 font-mono text-[13.5px] text-ink">
                <Check size={16} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                MP4 · MOV · WEBM · ≤ 50 MB
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <TrackedLink where="workflow" href={tryHref} className={buttonClasses("primary", "lg")}>
                  {t("hero.cta")}
                  <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                <Link href="#how-it-works" className={buttonClasses("secondary", "lg")}>
                  {t("hero.secondary")}
                  <ArrowDown size={16} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- 4 · texto e imagem: a aposta, o segundo da queda conferível no Insights ---------- */}
        <section className="container-page pt-24 sm:pt-36">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal className="lg:order-1">
              <SectionIndex label={s("bet")} />
              <h2 className="t-h2 mt-5 text-balance">
                <Emphasis text={t("loop.title")} />
              </h2>
              <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
              <div className="mt-8">{cta("bet", "start")}</div>
            </Reveal>
            {/* os dois cartões da previsão (exemplo), num painel como os do produto */}
            <Reveal delay={80} className="lg:order-2">
              <div className="flex flex-col gap-4 rounded-[32px] border border-[var(--stage-line)] bg-[var(--stage)] p-4 sm:rounded-[40px] sm:p-6">
                <div className="rounded-[24px] border border-line bg-paper-raised p-6 sm:p-7">
                  <p className="sr-only">{t("loop.first.line", { time: dropTime })}</p>
                  <div className="flex items-center justify-end">
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div aria-hidden="true" className="mt-4 grid grid-cols-2 border-t border-line">
                    <div className="pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.first.weSaid")}</p>
                      <p className="mt-2 font-serif text-[48px] font-medium leading-none tracking-[-0.03em] tabular-nums">{dropTime}</p>
                    </div>
                    <div className="border-l border-line pl-6 pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.first.insightsSays")}</p>
                      <p className="mt-2 font-serif text-[48px] font-medium leading-none tracking-[-0.03em] tabular-nums text-accent">{dropTime}</p>
                    </div>
                  </div>
                  <p aria-hidden="true" className="mt-5 flex items-center gap-2 text-[15px] font-semibold">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.first.hit")}
                  </p>
                </div>
                <div className="rounded-[24px] border border-line bg-paper-raised p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] text-ink-muted">{t("loop.metric", { time: loopTime })}</p>
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-2 border-t border-line">
                    <div className="pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.predicted")}</p>
                      <p className="mt-2 font-serif text-[52px] font-medium leading-none tracking-[-0.03em] tabular-nums">{loopSample.prediction.predicted}%</p>
                    </div>
                    <div className="border-l border-line pl-6 pt-5">
                      <p className="text-[14px] text-ink-muted">{t("loop.actual")}</p>
                      <p className="mt-2 font-serif text-[52px] font-medium leading-none tracking-[-0.03em] tabular-nums text-accent">{loopSample.prediction.actual}%</p>
                    </div>
                  </div>
                  <p className="mt-5 flex items-center gap-2 text-[14.5px] font-medium">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.sampleVerdict", { diff: loopDiff })}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- 5 · o simulador (é o "How it works" do menu): escolher uma linha e ver a nota ---------- */}
        <section id="how-it-works" className="scroll-mt-24 px-3 pt-24 sm:px-4 sm:pt-36">
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

        {/* ---------- 6 · quem está construindo: texto e foto ---------- */}
        <section className="container-page pt-24 sm:pt-36">
          <FounderBand />
        </section>

        {/* ---------- 7 · poucas dúvidas, em cartões; à esquerda, o título e a ação ---------- */}
        <section id="faq" className="container-page scroll-mt-24 pt-24 sm:pt-36">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeader label={s("faq")} title={t("faq.title")} />
              <Reveal delay={80} className="mt-8">
                {cta("faq", "start")}
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

        {/* ---------- 8 · o convite final: "você leu até aqui", no mesmo palco do hero ---------- */}
        <section className="px-3 pb-6 pt-24 sm:px-4 sm:pb-8 sm:pt-36">
          <Reveal className="rounded-[32px] border border-[var(--stage-line)] bg-[var(--stage)] px-6 py-20 text-center sm:rounded-[44px] sm:py-28">
            <h2 className="t-display mx-auto max-w-[17ch] text-balance">
              <Emphasis text={`${t("final.readThisFar")} ${t("final.title")}`} />
            </h2>
            <p className="t-lead mx-auto mt-6 max-w-[52ch]">{t("final.lead")}</p>
            <div className="mt-10 flex flex-col items-center gap-3">
              {cta("final")}
              <Link href={localePath(locale, "/pricing")} className="mt-2 text-[14.5px] font-semibold text-ink underline decoration-[var(--stage-line)] decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink">
                {tPricing("fromPrice", { price: PLANS.creator.display })}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
