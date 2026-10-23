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
        {/* ---------- 1 · hero: um palco arredondado (o cabeçalho flutua dentro dele), a promessa, uma ação e o produto ---------- */}
        <section className="-mt-[56px] px-3 sm:-mt-[60px] sm:px-4">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--stage-line)] bg-[var(--stage)] pt-[56px] sm:pt-[60px]">
            <div className="container-page pb-6 pt-8 text-center sm:pb-10 sm:pt-12 lg:pb-12">
              <Reveal eager>
                <p className="chip">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
                  {t("hero.kicker")}
                </p>
              </Reveal>
              <Reveal eager delay={40}>
                <h1 className="t-display mx-auto mt-4 max-w-[20ch] text-balance">
                  {t("hero.title1")} <em>{t("hero.title2")}</em>
                </h1>
              </Reveal>
              <Reveal eager delay={80}>
                <p className="t-lead mx-auto mt-4 max-w-[58ch]">{t("hero.lead")}</p>
              </Reveal>
              <Reveal eager delay={120} className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:gap-6">
                <TrackedLink where="hero" href={tryHref} className={buttonClasses("primary", "lg")}>
                  {t("hero.cta")}
                  <ArrowRight size={17} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                {/* a segunda ação é um link, não um segundo botão: o caminho principal fica um só */}
                <TrackedLink
                  where="hero_how"
                  href="#how-it-works"
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 text-[14.5px] font-semibold text-ink underline decoration-[var(--stage-line)] decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink"
                >
                  {t("hero.secondary")}
                  <ArrowDown size={15} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
              </Reveal>
              <Reveal eager delay={160} className="mt-3">
                <p className="text-[13px] text-ink-muted">{t("hero.ctaNote")}</p>
              </Reveal>

              {/* o produto, inteiro dentro do palco (cortado pela borda, parecia quebrado); a nota à mão aponta o segundo da queda */}
              <Reveal eager delay={200} className="relative mx-auto mt-[76px] max-w-[1080px] text-left sm:mt-20">
                <HandNote arrow="down-left" className="absolute -top-[66px] right-1 sm:-top-[72px] sm:right-[30%] lg:right-[44%]">
                  {t("notes.hero")}
                </HandNote>
                <HeroProduct sample={sample} />
              </Reveal>
            </div>
          </div>
          <p className="container-page mt-3 text-center text-[12px] leading-relaxed text-ink-muted">{t("hero.sampleNote")}</p>
        </section>

        {/* ---------- 2 · um número grande e quatro cartões: o que muda, em uma linha cada ---------- */}
        <section className="container-page pt-12 sm:pt-16">
          <Reveal className="mx-auto max-w-[780px] text-center">
            <p className="font-serif text-[56px] font-medium leading-none tracking-[-0.04em] text-caramel-ink sm:text-[80px]" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
              {facts[0].value}
            </p>
            <h2 className="t-h2 mt-2 text-balance first-letter:uppercase">{facts[0].label}</h2>
            <p className="t-lead mx-auto mt-4 max-w-[52ch]">
              {t("worksWith")} {t("worksAlso")}
            </p>
          </Reveal>
          <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item, index) => {
              const Icon = VALUE_ICONS[index] ?? Check;
              return (
                <Reveal as="li" key={item.title} delay={index * 60} className="flex flex-col items-center rounded-xl border border-line bg-paper-raised p-5 text-center">
                  <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-lg bg-[var(--stage)] text-caramel-ink">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-[15.5px] font-semibold leading-snug tracking-[-0.015em] text-balance">{item.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{item.text}</p>
                </Reveal>
              );
            })}
          </ul>
          <Reveal className="mt-8">{cta("facts")}</Reveal>
        </section>

        {/* ---------- 3 · imagem e texto: onde a publishub entra, sem plugin nem editor novo ---------- */}
        <section className="container-page pt-14 sm:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* o vídeo sai do editor de sempre: o Reel no celular e, embaixo, os apps de onde ele costuma vir */}
            <Reveal className="relative">
              <div className="relative mx-auto flex max-w-[480px] justify-center overflow-hidden rounded-3xl border border-[var(--stage-line)] bg-[var(--stage)] px-6 pb-24 pt-8 sm:pb-16">
                <div className="relative w-[200px] rounded-[34px] border-[6px] border-[#1e1b18] bg-[#1e1b18] shadow-window sm:w-[220px]">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[28px]">
                    <Image src={HERO_REEL_POSTER} alt={t("hero.posterAlt")} fill sizes="220px" className="object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-medium text-white">{t("mock.example")}</span>
                    <span className="absolute inset-x-3 bottom-4 rounded-2xl bg-[#fffdf8]/95 px-3.5 py-3 text-left shadow-float">
                      <span className="block font-mono text-[11px] text-[#8a4f22]">{lines[0].time}</span>
                      <span className="hand mt-0.5 block text-[18px] first-letter:uppercase">{lines[0].note}</span>
                    </span>
                  </div>
                </div>
                <ul className="absolute inset-x-0 bottom-6 flex flex-wrap justify-center gap-1.5 px-5">
                  {EDITORS.map((name) => (
                    <li key={name} className="rounded-full border border-line bg-paper-raised px-3 py-1 text-[12.5px] font-semibold text-ink shadow-card">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <SectionIndex label={s("workflow")} />
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("workflow.title")} />
              </h2>
              <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-ink-muted">{t("workflow.lead")}</p>
              <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-ink-muted">{t("workflow.back.text")}</p>
              {/* os formatos, num campo como o de copiar: é tudo o que a pessoa precisa saber para começar */}
              <p className="mt-5 inline-flex max-w-full items-center gap-2.5 rounded-lg border border-dashed border-line bg-paper-raised px-3.5 py-2.5 font-mono text-[13px] text-ink">
                <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                MP4 · MOV · WEBM · ≤ {MAX_VIDEO_BYTES / 1024 / 1024} MB
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <TrackedLink where="workflow" href={tryHref} className={buttonClasses("primary", "md")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </TrackedLink>
                <Link href="#how-it-works" className={buttonClasses("secondary", "md")}>
                  {t("hero.secondary")}
                  <ArrowDown size={16} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- 4 · texto e imagem: a aposta, o segundo da queda conferível no Insights ---------- */}
        <section className="container-page pt-14 sm:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal className="lg:order-1">
              <SectionIndex label={s("bet")} />
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("loop.title")} />
              </h2>
              <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
              <div className="mt-5">{cta("bet", "start")}</div>
            </Reveal>
            {/* os dois cartões da previsão (exemplo), num painel como os do produto */}
            <Reveal delay={80} className="lg:order-2">
              <div className="flex flex-col gap-3 rounded-3xl border border-[var(--stage-line)] bg-[var(--stage)] p-3 sm:p-4">
                <div className="rounded-xl border border-line bg-paper-raised p-4 sm:p-5">
                  <p className="sr-only">{t("loop.first.line", { time: dropTime })}</p>
                  <div className="flex items-center justify-end">
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div aria-hidden="true" className="mt-3 grid grid-cols-2 border-t border-line">
                    <div className="pt-4">
                      <p className="text-[13px] text-ink-muted">{t("loop.first.weSaid")}</p>
                      <p className="mt-2 font-serif text-[32px] font-medium leading-none tracking-[-0.03em] tabular-nums">{dropTime}</p>
                    </div>
                    <div className="border-l border-line pl-4 pt-4">
                      <p className="text-[13px] text-ink-muted">{t("loop.first.insightsSays")}</p>
                      <p className="mt-2 font-serif text-[32px] font-medium leading-none tracking-[-0.03em] tabular-nums text-accent">{dropTime}</p>
                    </div>
                  </div>
                  <p aria-hidden="true" className="mt-4 flex items-center gap-2 text-[14px] font-semibold">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.first.hit")}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-paper-raised p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] text-ink-muted">{t("loop.metric", { time: loopTime })}</p>
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 border-t border-line">
                    <div className="pt-4">
                      <p className="text-[13px] text-ink-muted">{t("loop.predicted")}</p>
                      <p className="mt-2 font-serif text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums">{loopSample.prediction.predicted}%</p>
                    </div>
                    <div className="border-l border-line pl-4 pt-4">
                      <p className="text-[13px] text-ink-muted">{t("loop.actual")}</p>
                      <p className="mt-2 font-serif text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums text-accent">{loopSample.prediction.actual}%</p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-[14px] font-medium">
                    <Check size={15} strokeWidth={2.5} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.sampleVerdict", { diff: loopDiff })}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- 5 · o simulador (é o "How it works" do menu): escolher uma linha e ver a nota ---------- */}
        <section id="how-it-works" className="scroll-mt-20 px-3 pt-14 sm:px-4 sm:pt-20">
          <div className="rounded-3xl bg-[#1e1b18] px-4 py-12 text-center text-[#f6f0e4] sm:px-8 sm:py-14 [&_em]:!text-[#e0a36f]">
            <Reveal className="mx-auto max-w-[760px]">
              <p className="chip !border-white/15 !bg-white/[0.06] !text-[#f6f0e4]/75">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caramel" />
                {t("sim.kicker")}
              </p>
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("sim.title")} />
              </h2>
              <p className="mx-auto mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-[#f6f0e4]/70">{t("sim.lead")}</p>
            </Reveal>
            <Reveal delay={80} className="relative mt-[76px] sm:mt-20">
              <HandNote arrow="down-left" className="absolute -top-[66px] right-[6%] !text-[#b9cbff] sm:-top-[72px] sm:right-[22%]">
                {t("notes.sim")}
              </HandNote>
              <LineSimulator items={simItems} label={t("sim.kicker")} labels={{ youSay: t("sim.youSay"), note: t("sim.note"), tryInstead: t("sim.tryInstead"), example: t("sim.example") }} />
            </Reveal>
            <Reveal className="mt-8 flex flex-col items-center gap-2">
              <TrackedLink where="simulator" href={tryHref} className={buttonClasses("primary", "md", "!border-transparent !bg-[#f6f0e4] !text-[#1e1b18] hover:!bg-white")}>
                {t("hero.cta")}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </TrackedLink>
              <p className="text-[13px] text-[#f6f0e4]/60">{t("hero.ctaNote")}</p>
            </Reveal>
          </div>
        </section>

        {/* ---------- 6 · quem está construindo: texto e foto ---------- */}
        <section className="container-page pt-14 sm:pt-20">
          <FounderBand />
        </section>

        {/* ---------- 7 · poucas dúvidas, em cartões; à esquerda, o título e a ação ---------- */}
        <section id="faq" className="container-page scroll-mt-20 pt-14 sm:pt-20">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionHeader label={s("faq")} title={t("faq.title")} />
              <Reveal delay={80} className="mt-5">
                {cta("faq", "start")}
              </Reveal>
            </div>
            <Reveal delay={80} className="flex flex-col gap-2">
              {FAQ.map((n) => (
                <details key={n} className="group rounded-xl border border-line bg-paper-raised px-4 transition-colors duration-150 hover:border-[rgba(var(--ink-rgb),0.18)] sm:px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[15px] font-semibold tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                    {t(`faq.q${n}`)}
                    <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform duration-200 ease-out group-open:rotate-45 group-hover:text-ink">
                      <Plus size={14} strokeWidth={2} />
                    </span>
                  </summary>
                  <p className="fade-in max-w-[64ch] pb-4 text-[14.5px] leading-relaxed text-ink-muted">{t(`faq.a${n}`, { email: SUPPORT_EMAIL })}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------- 8 · o convite final: "você leu até aqui", no mesmo palco do hero ---------- */}
        <section className="px-3 pb-4 pt-14 sm:px-4 sm:pb-5 sm:pt-20">
          <Reveal className="rounded-3xl border border-[var(--stage-line)] bg-[var(--stage)] px-4 py-12 text-center sm:py-16">
            <h2 className="t-display mx-auto max-w-[20ch] text-balance">
              <Emphasis text={`${t("final.readThisFar")} ${t("final.title")}`} />
            </h2>
            <p className="t-lead mx-auto mt-4 max-w-[56ch]">{t("final.lead")}</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              {cta("final", "center", "lg")}
              <Link href={localePath(locale, "/pricing")} className="mt-2 text-[14px] font-semibold text-ink underline decoration-[var(--stage-line)] decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink">
                {tPricing("fromPrice", { price: PLANS.creator.display })}
              </Link>
              {/* o risco de pagar, desfeito ao lado do preço: a mesma garantia dos cartões de /pricing */}
              <p className="text-[13px] text-ink-muted">{tPricing("guarantee")}</p>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
