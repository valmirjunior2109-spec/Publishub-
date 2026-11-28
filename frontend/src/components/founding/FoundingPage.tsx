import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { FaqList } from "@/components/FaqList";
import { Reveal } from "@/components/Reveal";
import { PixelIcon } from "@/components/ui/Pixel";
import { FoundingCheckoutButton } from "@/components/waitlist/FoundingCheckoutButton";
import { FoundingPriceAmount, FoundingPriceText } from "@/components/waitlist/FoundingPrice";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { FOUNDING_COPY } from "@/content/founding";
import { FOUNDING_TERMS_ANCHOR } from "@/lib/founding";
import { HTML_LANG, localePath, type Locale } from "@/lib/i18n";

/**
 * A página do Founding Customers nos dois idiomas. O botão de reserva abre o Stripe Checkout (US$ 0 hoje); o preço
 * vem do Stripe (FoundingPrice), então a página continua estática.
 */
export function FoundingPage({ locale }: { locale: Locale }) {
  const t = FOUNDING_COPY[locale];

  return (
    <div lang={HTML_LANG[locale]}>
      <WaitlistTracker />

      {/* ---------- 1. hero ---------- */}
      <section aria-labelledby="founding-heading" className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="landing-grid" />
        <div aria-hidden="true" className="landing-beam" />
        <div className="container-page relative pb-16 pt-14 text-center sm:pb-20 sm:pt-20">
          <p className="eyebrow justify-center">{t.hero.eyebrow}</p>
          <h1 id="founding-heading" className="mx-auto mt-4 max-w-3xl text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">{t.hero.sub}</p>
          <p className="mx-auto mt-6 flex flex-wrap items-baseline justify-center gap-x-2">
            <FoundingPriceAmount locale={locale} />
            <span className="text-[15px] text-muted">{t.hero.afterLaunch}</span>
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <FoundingCheckoutButton label={t.hero.reserve} locale={locale} />
          </div>
          <p className="mt-3 font-semibold text-success">{t.hero.zero}</p>
        </div>
      </section>

      {/* ---------- 2. o problema ---------- */}
      <section aria-labelledby="problem-heading" className="container-page py-16 sm:py-24">
        <Reveal className="max-w-3xl">
          <h2 id="problem-heading" className="text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
            {t.problem.title}
          </h2>
          <div className="mt-5 space-y-4 text-lg text-muted">
            <p>{t.problem.p1}</p>
            <p>{t.problem.p2}</p>
            <p className="font-semibold text-ink">{t.problem.p3}</p>
          </div>
        </Reveal>
      </section>

      {/* ---------- 3. o que você recebe (quando lançar) ---------- */}
      <section aria-labelledby="perks-heading" className="border-y border-line bg-surface">
        <div className="container-page py-16 sm:py-24">
          <h2 id="perks-heading" className="text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
            {t.perks.title}
          </h2>
          <p className="mt-3 text-lg text-muted">{t.perks.lead}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {t.perks.items.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-md border border-line bg-card p-4">
                <span aria-hidden="true" className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                  <PixelIcon name="star" size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 max-w-2xl border-l-4 border-action bg-accent-soft px-4 py-3 text-[15px]">
            <p className="font-semibold">{t.perks.zero}</p>
            <p className="mt-1">{t.perks.notYet}</p>
          </div>
        </div>
      </section>

      {/* ---------- 4. como vai funcionar e 5. para quem é ---------- */}
      <section className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">{t.how.title}</h2>
          <ol className="mt-8 grid gap-4">
            {t.how.steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="font-pixel text-lg text-accent">0{index + 1}</span>
                <span className="text-lg">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">{t.who.title}</h2>
          <ul className="mt-8 grid gap-3">
            {t.who.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-lg">
                <Check aria-hidden="true" className="mt-1.5 h-4 w-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- a reserva em detalhes (os mesmos termos da home e de /terms) ---------- */}
      <section aria-labelledby="terms-heading" className="container-page pb-16 sm:pb-24">
        <div className="max-w-3xl rounded-md border border-line-strong bg-card p-6 sm:p-8">
          <h2 id="terms-heading" className="text-2xl font-bold">
            {t.terms.title}
          </h2>
          <ol className="mt-5 grid gap-3 text-[15px]">
            <li className="flex gap-3">
              <span className="font-pixel text-base text-accent">01</span>
              <span>{t.terms.step1}</span>
            </li>
            <li className="flex gap-3">
              <span className="font-pixel text-base text-accent">02</span>
              <span>{t.terms.step2}</span>
            </li>
            <li className="flex gap-3">
              <span className="font-pixel text-base text-accent">03</span>
              <span>
                <strong>{t.terms.step3a}</strong> <FoundingPriceText locale={locale} />
                {t.terms.step3b}
              </span>
            </li>
          </ol>
          <p className="mt-4 text-sm">
            <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>{t.terms.full}</Link>
          </p>
        </div>
      </section>

      {/* ---------- 6. dúvidas ---------- */}
      <section aria-labelledby="faq-heading" className="border-t border-line bg-surface">
        <div className="container-page grid gap-8 py-16 sm:py-24 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <h2 id="faq-heading" className="text-3xl font-bold sm:text-[2.5rem] sm:leading-[1.1]">
            {t.faqTitle}
          </h2>
          <FaqList items={t.faq} />
        </div>
      </section>

      {/* ---------- 7. convite final ---------- */}
      <section aria-labelledby="final-heading" className="container-page py-16 text-center sm:py-24">
        <h2 id="final-heading" className="text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
          {t.final.title}
        </h2>
        <div className="mx-auto mt-7 max-w-md">
          <FoundingCheckoutButton label={t.final.reserve} locale={locale} />
        </div>
        <p className="mt-3 font-semibold text-success">{t.hero.zero}</p>
        <Link href={localePath(locale, "/check")} data-cta="founding_check" className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold">
          {t.final.check}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
