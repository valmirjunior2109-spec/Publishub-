import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { offerFor } from "@/lib/pricing";

/* A landing usa uma análise de exemplo (fixture) como material visual. */
const sample = analyses[0];

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
  const offer = offerFor();
  const dropTime = formatTimestamp(sample.dropAtSec);
  const lost = Math.round(sample.retention[sample.dropAtSec][1] - sample.retention[sample.dropAtSec + 2][1]);

  return (
    <>
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
            <Reveal delay={240} className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses("primary", "md", "px-6 py-3")}>
                {t("hero.cta")}
              </Link>
              <a href="#como-funciona" className={buttonClasses("secondary", "md", "px-6 py-3")}>
                {t("hero.secondary")}
              </a>
            </Reveal>
          </div>

          <figure className="lg:pt-2">
            <Reveal variant="curve" delay={300} className="rounded-md border border-line bg-paper-raised p-4">
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
            </Reveal>
            {/* marginália: a anotação ao lado, como numa revista */}
            <Reveal delay={1500} as="figure" className="mt-4 border-l border-ink pl-4">
              <p className="text-[13px] text-ink-muted">{t("hero.marginalia", { time: dropTime, lost })}</p>
              <p className="mt-1 font-display text-[19px] italic leading-snug tracking-tight">&ldquo;{sample.transcript.phrase}&rdquo;</p>
              <p className="mt-3 text-[12px] text-ink-muted">{t("hero.sampleNote")}</p>
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
                <p className="mt-2 max-w-[36ch] font-display text-[18px] italic leading-snug">&ldquo;{sample.transcript.phrase}&rdquo;</p>
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
            <Reveal delay={250} className="mt-2 grid max-w-md grid-cols-2 gap-4 rounded-md border border-line bg-paper-raised p-5">
              <div>
                <p className="t-label">{t("loop.predicted")}</p>
                <p className="mt-2 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight">72%</p>
              </div>
              <div>
                <p className="t-label">{t("loop.actual")}</p>
                <p className="mt-2 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight text-confirmed">75%</p>
              </div>
              <p className="col-span-2 border-t border-line pt-3 text-[13px]">
                <Badge tone="confirmed">{t("loop.sampleVerdict")}</Badge>
              </p>
            </Reveal>
          </div>
        </section>

        <Divider />

        {/* ---------- a oferta ---------- */}
        <section className="mx-auto max-w-page px-5 py-16 lg:px-16 lg:py-20">
          <Reveal className="grid gap-8 rounded-md border border-line bg-paper-raised p-7 sm:p-10 lg:grid-cols-[2fr_3fr] lg:items-center">
            <div>
              <p className="eyebrow">{t("offer.eyebrow", { plan: offer.name })}</p>
              <p className="mt-4 font-display text-[64px] font-bold leading-none tracking-[-0.03em] sm:text-[80px]">{offer.display}</p>
              <p className="mt-2 text-sm text-ink-muted">{t("offer.once")}</p>
              <p className="mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-ink-muted">{t("offer.currencyNote")}</p>
            </div>
            <div>
              <h2 className="font-display text-[28px] font-medium leading-tight tracking-tight sm:text-[32px]">{t("offer.title")}</h2>
              <p className="mt-3 max-w-[50ch] text-[15px] leading-relaxed text-ink-muted">{t("offer.lead")}</p>
              <Link href="/planos" className={buttonClasses("primary", "md", "mt-6 px-6 py-3")}>
                {t("offer.cta")}
              </Link>
            </div>
          </Reveal>
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
            <p className="text-[13px] text-ink-muted">{t("footer")}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
