import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight, Check, Plus } from "lucide-react";
import { ArtBackdrop, ArtTile } from "@/components/landing/Art";
import { Emphasis } from "@/components/landing/Emphasis";
import { FounderBand } from "@/components/landing/FounderBand";
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

/* Os quatro ganhos, cada um com a sua gravura (a ordem é a de Landing.value.items). */
const VALUE_ART = ["curve", "wave", "frames", "cut"] as const;

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
 * A home: a promessa e o produto; para quem é; quatro ganhos com gravuras; duas seções
 * divididas; o simulador; quem está construindo; poucas dúvidas; e o convite final.
 * Calma de propósito: muito espaço, cor só onde importa e a ação principal só três vezes.
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
        {/* ---------- 1 · a promessa, à esquerda e com espaço: uma ação principal e o produto logo abaixo ---------- */}
        <section className="container-page pt-12 sm:pt-20 lg:pt-24">
          <Reveal eager>
            <p className="chip">{t("hero.kicker")}</p>
          </Reveal>
          <Reveal eager delay={40}>
            <h1 className="t-display mt-5 max-w-[17ch] text-balance">
              {t("hero.title1")} <em>{t("hero.title2")}</em>
            </h1>
          </Reveal>
          <Reveal eager delay={80}>
            <p className="t-lead mt-6 max-w-[56ch]">{t("hero.lead")}</p>
          </Reveal>
          <Reveal eager delay={120} className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
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
        </section>
        <section className="px-3 pt-10 sm:px-4 sm:pt-14">
          <Reveal eager delay={200} className="relative mx-auto max-w-[1360px] overflow-hidden rounded-3xl px-3 pb-10 pt-8 sm:px-8 sm:pb-16 sm:pt-14">
            <ArtBackdrop />
            <div className="relative mx-auto max-w-[1080px] text-left">
              <HeroProduct sample={sample} />
            </div>
          </Reveal>
          <p className="container-page mt-3 text-[12px] leading-relaxed text-ink-muted">{t("hero.sampleNote")}</p>
        </section>

        {/* ---------- 2 · para quem é e os editores de onde o vídeo sai: só os nomes, em voz baixa ---------- */}
        <section className="container-page pt-10 sm:pt-14">
          <Reveal className="flex flex-col gap-4 border-y border-line py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">{t("worksWith")}</p>
            <ul className="flex flex-wrap gap-x-7 gap-y-2">
              {EDITORS.map((name) => (
                <li key={name} className="text-[16px] font-medium tracking-[-0.015em] text-ink-muted">
                  {name}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ---------- 3 · o que muda: quatro ganhos, cada um com a sua gravura ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <Reveal className="grid gap-4 lg:grid-cols-2 lg:gap-12">
            <h2 className="t-h2 text-balance first-letter:uppercase">
              {facts[0].value} <em className="t-serif-em">{facts[0].label}</em>
            </h2>
            <p className="t-lead max-w-[52ch] lg:pt-2">{t("worksAlso")}</p>
          </Reveal>
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item, index) => (
              <Reveal as="li" key={item.title} delay={index * 60}>
                <ArtTile name={VALUE_ART[index] ?? "curve"} />
                <h3 className="mt-5 text-[16px] font-medium leading-snug tracking-[-0.015em] text-balance">{item.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{item.text}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ---------- 4 · onde a publishub entra, sem plugin nem editor novo ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <SectionIndex label={s("workflow")} />
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("workflow.title")} />
              </h2>
              <p className="t-lead mt-5 max-w-[50ch]">{t("workflow.lead")}</p>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{t("workflow.back.text")}</p>
              <p className="mt-6 font-mono text-[13px] text-ink-muted">MP4 · MOV · WEBM · ≤ {MAX_VIDEO_BYTES / 1024 / 1024} MB</p>
            </Reveal>
            <Reveal delay={80}>
              <div className="relative mx-auto flex max-w-[520px] justify-center overflow-hidden rounded-3xl px-6 py-12">
                <ArtBackdrop />
                <div className="relative w-[200px] rounded-[30px] border-[6px] border-[#191816] bg-[#191816] shadow-window sm:w-[230px]">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[24px]">
                    <Image src={HERO_REEL_POSTER} alt={t("hero.posterAlt")} fill sizes="230px" className="object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-medium text-white">{t("mock.example")}</span>
                    <span className="absolute inset-x-3 bottom-3 rounded-xl bg-white px-3.5 py-3 text-left text-[#191816] shadow-float">
                      <span className="block font-mono text-[11px] text-[#9a5a2c]">{lines[0].time}</span>
                      <span className="mt-0.5 block font-serif text-[17px] leading-snug first-letter:uppercase">{lines[0].note}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- 5 · a aposta: o segundo da queda, conferível no Insights ---------- */}
        <section className="container-page pt-20 sm:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal delay={80} className="max-lg:order-2">
              <div className="flex flex-col gap-3 rounded-3xl bg-surface p-3 sm:p-5">
                <div className="rounded-xl bg-paper-raised p-5">
                  <p className="sr-only">{t("loop.first.line", { time: dropTime })}</p>
                  <div className="flex items-center justify-end">
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div aria-hidden="true" className="mt-3 grid grid-cols-2">
                    <div>
                      <p className="text-[13px] text-ink-muted">{t("loop.first.weSaid")}</p>
                      <p className="mt-2 font-serif text-[34px] leading-none tracking-[-0.02em] tabular-nums">{dropTime}</p>
                    </div>
                    <div className="border-l border-line pl-5">
                      <p className="text-[13px] text-ink-muted">{t("loop.first.insightsSays")}</p>
                      <p className="mt-2 font-serif text-[34px] leading-none tracking-[-0.02em] tabular-nums">{dropTime}</p>
                    </div>
                  </div>
                  <p aria-hidden="true" className="mt-4 flex items-center gap-2 text-[14px] font-medium">
                    <Check size={15} strokeWidth={2.25} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.first.hit")}
                  </p>
                </div>
                <div className="rounded-xl bg-paper-raised p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] text-ink-muted">{t("loop.metric", { time: loopTime })}</p>
                    <Badge>{t("loop.sampleTag")}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2">
                    <div>
                      <p className="text-[13px] text-ink-muted">{t("loop.predicted")}</p>
                      <p className="mt-2 font-serif text-[34px] leading-none tracking-[-0.02em] tabular-nums">{loopSample.prediction.predicted}%</p>
                    </div>
                    <div className="border-l border-line pl-5">
                      <p className="text-[13px] text-ink-muted">{t("loop.actual")}</p>
                      <p className="mt-2 font-serif text-[34px] leading-none tracking-[-0.02em] tabular-nums">{loopSample.prediction.actual}%</p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-[14px] font-medium">
                    <Check size={15} strokeWidth={2.25} className="shrink-0 text-confirmed" aria-hidden="true" />
                    {t("loop.sampleVerdict", { diff: loopDiff })}
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal className="max-lg:order-1">
              <SectionIndex label={s("bet")} />
              <h2 className="t-h2 mt-4 text-balance">
                <Emphasis text={t("loop.title")} />
              </h2>
              <p className="t-lead mt-5 max-w-[50ch]">{t("loop.text1")}</p>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
            </Reveal>
          </div>
        </section>

        {/* ---------- 6 · o simulador (é o "How it works" do menu): escolher uma linha e ver a nota ---------- */}
        <section id="how-it-works" className="scroll-mt-20 px-3 pt-20 sm:px-4 sm:pt-28">
          <div className="mx-auto max-w-[1360px] rounded-3xl bg-surface px-4 py-14 sm:px-8 sm:py-20">
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

        {/* ---------- 9 · o convite final: uma frase, o botão e o preço ---------- */}
        <section className="container-page pb-20 pt-24 sm:pb-28 sm:pt-36">
          <Reveal className="mx-auto max-w-[860px] text-center">
            <h2 className="t-display text-balance">
              <Emphasis text={`${t("final.readThisFar")} ${t("final.title")}`} />
            </h2>
            <p className="t-lead mx-auto mt-6 max-w-[54ch]">{t("final.lead")}</p>
            <div className="mt-8 flex flex-col items-center gap-2">
              {cta("final", "center", "lg")}
              <Link href={localePath(locale, "/pricing")} className="mt-3 text-[14px] font-medium text-ink underline-offset-4 hover:underline">
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
