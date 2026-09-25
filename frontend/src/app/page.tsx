import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { HeroUpload } from "@/components/HeroUpload";
import { PricingCards } from "@/components/PricingCards";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { guidesIn } from "@/lib/guides";
import { OFFERS } from "@/lib/pricing";
import { jsonLd, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";

export function generateMetadata() {
  return pageMetadata("home", "/");
}

/* A landing usa uma análise de exemplo (fixture) como material visual. */
const sample = analyses[0];
/* O bloco do loop mostra um ciclo fechado: esta é a única fixture com previsão e número real. */
const loopSample = analyses[1];

function Divider() {
  return (
    <Reveal variant="curve" className="mx-auto max-w-page px-5 lg:px-16" as="div">
      <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="divider" className="block h-12 w-full" />
    </Reveal>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const tCommon = await getTranslations("Common");
  const dropTime = formatTimestamp(sample.dropAtSec);
  // as três primeiras linhas do plano de exemplo, do mesmo vídeo da curva
  const planItems = t.raw("hero.planItems") as { time: string; kind: string; text: string }[];
  const lost = Math.round(sample.retention[sample.dropAtSec][1] - sample.retention[sample.dropAtSec + 2][1]);
  const loopTime = formatTimestamp(loopSample.prediction.atSecond);
  const loopDiff = Math.round((loopSample.prediction.actual ?? 0) - loopSample.prediction.predicted);
  const locale = await getLocale();
  const tSeo = await getTranslations("Seo.home");
  const home = `${SITE_URL}${localePath(locale, "/")}`;
  const hasGuides = guidesIn(locale).length > 0;

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
      offers: OFFERS.map((offer) => ({ "@type": "Offer", name: offer.name, price: offer.amount.toFixed(2), priceCurrency: offer.currency })),
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <RedirectIfSignedIn />
      <SiteHeader />
      <main>
        {/* ---------- hero: a frase + a curva com marginália ---------- */}
        <section className="mx-auto grid max-w-page gap-12 px-5 pb-16 pt-14 lg:grid-cols-[7fr_5fr] lg:gap-16 lg:px-16 lg:pt-20">
          <div>
            <Reveal as="p" className="eyebrow">
              {t("hero.eyebrow")}
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 max-w-[22ch] font-display text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-balance sm:text-[46px] lg:text-[52px]">{t("hero.title")}</h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t("hero.lead")}</p>
            </Reveal>
            {/* a caixa é o CTA: o teste grátis começa aqui, não numa página adiante */}
            <Reveal delay={240} className="mt-7">
              <HeroUpload />
            </Reveal>
            <Reveal delay={320} className="mt-5">
              <a href="#como-funciona" className="text-[13.5px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                {t("hero.secondary")}
              </a>
            </Reveal>
            <Reveal delay={400} as="p" className="mt-4 text-[13px] text-ink-muted">
              {t("hero.note")}
            </Reveal>
          </div>

          <figure className="lg:pt-2">
            <Reveal variant="curve" delay={300} className="rounded-md border border-line bg-paper-raised p-4">
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
            </Reveal>
            {/* marginália: a anotação ao lado, como numa revista */}
            <Reveal delay={620} as="figure" className="mt-4 border-l border-ink pl-4">
              <p className="text-[13px] text-ink-muted">{t("hero.marginalia", { time: dropTime, lost })}</p>
              <p className="mt-1 font-display text-[19px] italic leading-snug tracking-tight">&ldquo;{t("hero.samplePhrase")}&rdquo;</p>
              <p className="mt-3 text-[12px] text-ink-muted">{t("hero.sampleNote")}</p>
            </Reveal>

            {/* o terceiro ato: a curva mostra onde perde, a frase mostra por quê,
                e isto mostra o que volta — o plano, que é o produto */}
            <Reveal delay={760} className="mt-6 rounded-md border border-line bg-paper-raised p-5">
              <p className="t-label tracking-[0.08em]">{t("hero.planLabel")}</p>
              <ol className="mt-3 flex flex-col">
                {planItems.map((item) => (
                  <li key={item.time + item.kind} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-line py-2.5 first:border-t-0 first:pt-0 last:pb-0">
                    <span className="font-display text-[13px] font-semibold tabular-nums tracking-tight text-accent">{item.time}</span>
                    <span className="text-[11px] uppercase tracking-[0.06em] text-ink-muted">{item.kind}</span>
                    <span className="col-span-2 text-[13.5px] leading-snug">{item.text}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12px] text-ink-muted">{t("hero.planNote")}</p>
            </Reveal>
          </figure>
        </section>

        <Divider />

        {/* ---------- três momentos, em degraus ---------- */}
        <section id="como-funciona" className="mx-auto max-w-page px-5 py-16 lg:px-16 lg:py-20">
          <Reveal>
            <p className="eyebrow">{t("moments.eyebrow")}</p>
            <h2 className="mt-3 max-w-[20ch] font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]">{t("moments.title")}</h2>
          </Reveal>

          <ol className="mt-10 flex flex-col">
            {/* 01 — texto à esquerda, respiro à direita */}
            <Reveal as="li" className="grid gap-4 border-t border-line py-8 md:grid-cols-12">
              <span className="font-display text-[14px] text-ink-muted md:col-span-1">01</span>
              <h3 className="font-display text-[24px] font-medium tracking-tight md:col-span-4">{t("moments.one.title")}</h3>
              <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-muted md:col-span-6 md:col-start-6">{t("moments.one.text")}</p>
            </Reveal>

            {/* 02 — o timestamp domina, o texto vai para a direita */}
            <Reveal as="li" className="grid gap-4 border-t border-line py-8 md:grid-cols-12">
              <span className="font-display text-[14px] text-ink-muted md:col-span-1">02</span>
              <div className="md:col-span-5">
                <h3 className="font-display text-[24px] font-medium tracking-tight">{t("moments.two.title")}</h3>
                <p className="mt-4 font-display text-[88px] font-bold leading-none tracking-[-0.03em] text-accent sm:text-[112px]">{dropTime}</p>
                <p className="mt-2 max-w-[36ch] font-display text-[18px] italic leading-snug">&ldquo;{t("hero.samplePhrase")}&rdquo;</p>
              </div>
              <p className="max-w-[46ch] self-end text-[15px] leading-relaxed text-ink-muted md:col-span-5 md:col-start-8">{t("moments.two.text")}</p>
            </Reveal>

            {/* 03 — a reescrita, em card, deslocada para a direita */}
            <Reveal as="li" className="grid gap-4 border-b border-t border-line py-8 md:grid-cols-12">
              <span className="font-display text-[14px] text-ink-muted md:col-span-1">03</span>
              <div className="md:col-span-4">
                <h3 className="font-display text-[24px] font-medium tracking-tight">{t("moments.three.title")}</h3>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-ink-muted">{t("moments.three.text")}</p>
              </div>
              <div className="rounded-md border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft p-6 transition-transform duration-300 hover:-translate-y-0.5 md:col-span-6 md:col-start-7">
                <span className="t-label text-accent">{tCommon("version", { index: 1 })}</span>
                <p className="mt-3.5 font-display text-[17px] leading-[1.5]">&ldquo;{t("moments.sampleRewrite")}&rdquo;</p>
                <p className="mt-4 text-[13px] leading-[1.6] text-ink-muted">{t("moments.sampleWhy")}</p>
              </div>
            </Reveal>
          </ol>
        </section>

        <Divider />

        {/* ---------- as sete frentes do plano ---------- */}
        <section className="mx-auto grid max-w-page gap-10 px-5 py-16 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-16 lg:py-20">
          <Reveal>
            <p className="eyebrow">{t("plan.eyebrow")}</p>
            <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]">{t("plan.title")}</h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">{t("plan.lead")}</p>
          </Reveal>
          <Reveal delay={120}>
            <ol className="flex flex-col">
              {(["hook", "cut", "pacing", "broll", "caption", "structure", "cta"] as const).map((kind, index) => (
                <li key={kind} className="flex gap-5 border-t border-line py-4 last:border-b">
                  <span className="font-display text-[13px] tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                  <p className="max-w-[54ch] text-[15px] leading-relaxed">{t(`plan.items.${kind}`)}</p>
                </li>
              ))}
            </ol>
            <Link href={localePath(locale, "/experimentar")} className={buttonClasses("primary", "md", "mt-8 px-6 py-3")}>
              {t("hero.cta")}
            </Link>
            <p className="mt-2.5 text-[12.5px] text-ink-muted">{t("hero.ctaNote")}</p>
          </Reveal>
        </section>

        <Divider />

        {/* ---------- o loop ---------- */}
        <section className="mx-auto grid max-w-page gap-10 px-5 py-16 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-16 lg:py-20">
          <Reveal>
            <p className="eyebrow">{t("loop.eyebrow")}</p>
            <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]">{t("loop.title")}</h2>
          </Reveal>
          <div className="flex flex-col gap-6">
            <Reveal delay={100}>
              <p className="max-w-[58ch] text-[16px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-6 max-w-[58ch] text-[16px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
            </Reveal>
            {/* Um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso. */}
            <Reveal delay={250} className="mt-2 grid max-w-md grid-cols-2 gap-4 rounded-md border border-line bg-paper-raised p-5">
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
                <p className="t-label">{t("loop.metric", { time: loopTime })}</p>
                <Badge>{t("loop.sampleTag")}</Badge>
              </div>
              <div>
                <p className="t-label">{t("loop.predicted")}</p>
                <p className="mt-2 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight">{loopSample.prediction.predicted}%</p>
              </div>
              <div>
                <p className="t-label">{t("loop.actual")}</p>
                <p className="mt-2 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight text-confirmed">{loopSample.prediction.actual}%</p>
              </div>
              <p className="col-span-2 border-t border-line pt-3 text-[13px]">
                <Badge tone="confirmed">{t("loop.sampleVerdict", { diff: loopDiff })}</Badge>
              </p>
            </Reveal>
          </div>
        </section>

        <Divider />

        {/* ---------- a oferta: dois planos, os dois de pagamento único ---------- */}
        <section id="precos" className="mx-auto max-w-page px-5 py-16 lg:px-16 lg:py-20">
          <PricingCards />
        </section>

        {/* ---------- faq curto ---------- */}
        <section className="mx-auto grid max-w-page gap-8 px-5 pb-20 lg:grid-cols-[4fr_8fr] lg:px-16">
          <Reveal>
            <p className="eyebrow">{t("faq.eyebrow")}</p>
            <h2 className="mt-3 font-display text-[26px] font-medium tracking-tight">{t("faq.title")}</h2>
          </Reveal>
          <Reveal delay={120} className="flex flex-col">
            {(["1", "2", "3"] as const).map((n) => (
              <details key={n} className="group border-t border-line py-4 last:border-b">
                <summary className="flex items-center justify-between gap-4 text-[16px] font-medium">
                  {t(`faq.q${n}`)}
                  <span aria-hidden="true" className="text-xl font-light text-ink-muted transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </Reveal>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-5 py-8 lg:px-16">
            <Logo size="sm" label={tCommon("brand")} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {hasGuides && (
                <Link href={localePath(locale, "/guias")} className="text-[13px] text-ink-muted hover:text-ink">
                  {tCommon("guides")}
                </Link>
              )}
              <Link href={localePath(locale, "/planos")} className="text-[13px] text-ink-muted hover:text-ink">
                {tCommon("plans")}
              </Link>
              <Link href={localePath(locale, "/partners")} className="text-[13px] text-ink-muted hover:text-ink">
                {t("partners.cta")}
              </Link>
              <Link href={localePath(locale, "/privacidade")} className="text-[13px] text-ink-muted hover:text-ink">
                {tCommon("privacy")}
              </Link>
              <Link href={localePath(locale, "/termos")} className="text-[13px] text-ink-muted hover:text-ink">
                {tCommon("terms")}
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[13px] text-ink-muted hover:text-ink">
                {tCommon("support")}
              </a>
              <p className="text-[13px] text-ink-muted">{t("footer")}</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
