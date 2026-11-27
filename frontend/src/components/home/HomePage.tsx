import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, ClipboardList, ExternalLink, Globe, ScanEye, TriangleAlert } from "lucide-react";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { FaqList } from "@/components/FaqList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Reveal } from "@/components/Reveal";
import { buttonClasses } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/Pixel";
import { FoundingCheckoutButton } from "@/components/waitlist/FoundingCheckoutButton";
import { FoundingPriceAmount, FoundingPriceText } from "@/components/waitlist/FoundingPrice";
import { StillworksBanner } from "@/components/waitlist/StillworksBanner";
import { WaitlistCount } from "@/components/waitlist/WaitlistCount";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { HOME_COPY } from "@/content/home";
import { FOUNDING_PATH, FOUNDING_TERMS_ANCHOR, PRICING_ANCHOR, stillworksLink } from "@/lib/founding";
import { HTML_LANG, localePath, type Locale } from "@/lib/i18n";
import { SUPPORT_EMAIL } from "@/lib/site";

/**
 * A home nos dois idiomas: a estrutura é a mesma, os textos vêm de content/home.tsx.
 * A ordem do argumento: a promessa, o problema, como funciona hoje (o /check), um exemplo do que a pessoa
 * recebe, quem está por trás, a oferta Founding, o stillworks, as dúvidas e o convite final.
 * As âncoras #pricing e #early-access continuam existindo: links antigos (README do stillworks, posts) apontam para elas.
 */

const STEP_ICONS = [Globe, ScanEye, TriangleAlert, ClipboardList, Bot];

const enter = (delay: number) => ({ "--enter-delay": `${delay}ms` }) as CSSProperties;

export function HomePage({ locale }: { locale: Locale }) {
  const t = HOME_COPY[locale];
  const to = (path: string) => localePath(locale, path);

  return (
    <div lang={HTML_LANG[locale]}>
      <WaitlistTracker />
      <StillworksBanner locale={locale} />

      {/* ---------- 1. hero: a promessa e os três caminhos ---------- */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line">
        <div className="landing-grid" aria-hidden="true" />
        <div className="landing-beam" aria-hidden="true" />
        <div className="container-page relative pb-16 pt-14 text-center sm:pb-24 sm:pt-20">
          <p className="enter pill min-h-8 font-pixel text-[15px]" style={enter(0)}>
            <span aria-hidden="true" className="h-2 w-2 bg-action" />
            {t.hero.context}
          </p>
          <h1 id="hero-heading" className="enter mx-auto mt-6 max-w-4xl text-[2.4rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[4rem]" style={enter(80)}>
            {t.hero.h1}
          </h1>
          <p className="enter mx-auto mt-6 max-w-[60ch] text-lg text-muted sm:text-xl" style={enter(160)}>
            {t.hero.sub}
          </p>
          <div className="enter mx-auto mt-9 flex max-w-xl flex-col justify-center gap-3 sm:flex-row" style={enter(240)}>
            <Link href={to("/check")} data-cta="hero_check" className={buttonClasses("primary", "lg", "h-auto !whitespace-normal py-3")}>
              {t.hero.check}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
            <Link href={to(FOUNDING_PATH)} data-cta="hero_founding" className={buttonClasses("secondary", "lg", "h-auto !whitespace-normal py-3")}>
              {t.hero.founding}
            </Link>
          </div>
          <a href={stillworksLink("home_hero")} data-cta="hero_stillworks" className="enter mt-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-accent no-underline hover:text-ink" style={enter(280)}>
            {t.hero.stillworks}
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
          {/* quem está por trás e quantos já entraram, no momento da decisão */}
          <div className="enter mx-auto mt-6 flex max-w-xl items-center justify-center gap-3 text-left" style={enter(320)}>
            <Image src="/founder/valmir.jpg" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-sm border border-line-strong object-cover" />
            <p className="text-[15px] text-muted">
              {t.hero.builtBy}{" "}
              <a href="#founder-heading" data-cta="hero_founder" className="font-semibold text-ink">
                Valmir
              </a>
              {t.hero.builtByAfter} <WaitlistCount as="span" locale={locale} />
            </p>
          </div>
          <p className="enter mt-3 text-[15px] text-muted" style={enter(360)}>
            {t.hero.builtFor} <span className="font-mono text-[14px] text-ink">Lovable · Bolt · v0 · Cursor · Claude Code · Codex</span>
          </p>
        </div>
      </section>

      {/* ---------- 2. o problema, com a noite que quem constrói sozinho conhece ---------- */}
      <section aria-labelledby="problem-heading" className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <Reveal>
          <p className="eyebrow">{t.problem.eyebrow}</p>
          <h2 id="problem-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.problem.title}
          </h2>
          <div className="mt-5 space-y-4 text-lg text-muted">
            <p>{t.problem.p1}</p>
            <p>{t.problem.p2}</p>
            <p className="font-semibold text-ink">{t.problem.p3}</p>
          </div>
          <Link href={to("/check")} data-cta="problem_check" className={buttonClasses("primary", "lg", "mt-7")}>
            {t.problem.check}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Reveal>
        <Reveal>
          <ol aria-label={t.problem.label} className="relative space-y-6 border-l-2 border-line-strong pl-6">
            {t.problem.timeline.map(({ time, text }, index) => (
              <li key={`${time}-${index}`} className="relative">
                <span aria-hidden="true" className={`absolute -left-[33px] top-1.5 h-4 w-4 rounded-sm ${index === 3 ? "bg-critical" : "bg-action"}`} />
                <p className="font-pixel text-sm text-muted">{time}</p>
                <p className={`mt-1 text-lg ${index === 3 ? "font-semibold" : ""}`}>{text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ---------- 3. como funciona: o /check de hoje, e o que está em desenvolvimento ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{t.how.eyebrow}</p>
            <h2 id="how-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.how.title}
            </h2>
          </Reveal>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {t.how.steps.map(({ title, text }, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <Reveal as="li" key={title} delay={index * 70} className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface">
                      <Icon className="h-5 w-5 text-accent" />
                    </span>
                    <span className="font-pixel text-base text-accent">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{text}</p>
                </Reveal>
              );
            })}
          </ol>
          <div className="mt-8 grid max-w-3xl gap-2 text-[15px]">
            <p className="flex items-start gap-2">
              <PixelIcon name="pass" size={14} className="mt-1 shrink-0 text-success" />
              {t.how.today}
            </p>
            <p className="flex items-start gap-2 text-muted">
              <PixelIcon name="inconclusive" size={14} className="mt-1 shrink-0 text-warning" />
              {t.how.planned}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 4. prova de valor: como é o relatório (exemplo ilustrativo, sem app de ninguém) ---------- */}
      <section id="preview" aria-labelledby="proof-heading" className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal>
          <p className="eyebrow">{t.proof.eyebrow}</p>
          <h2 id="proof-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.proof.title}
          </h2>
          <Link href={to("/check")} data-cta="proof_check" className={buttonClasses("primary", "lg", "mt-7")}>
            {t.proof.check}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <CheckStatsLine className="mt-5" locale={locale} />
        </Reveal>
        <Reveal>
          <figure className="rounded-md border border-line-strong bg-card p-5 shadow-[6px_6px_0_0_var(--line)] sm:p-6">
            <figcaption className="font-pixel text-sm uppercase tracking-[0.06em] text-muted">{t.proof.sample}</figcaption>
            <p className="mt-3 text-2xl font-bold text-critical">{t.proof.found}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {t.proof.tiles.map((label, i) => (
                <div key={label} className="rounded-lg border border-line p-2 sm:p-3">
                  <dt className="text-xs text-muted sm:text-sm">{label}</dt>
                  <dd className={`font-pixel text-2xl ${i === 0 ? "text-success" : "text-critical"}`}>{i === 0 ? 0 : 1}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-4 space-y-2">
              {t.proof.rows.map((row) => (
                <li key={row.title} className="rounded-md border border-critical bg-critical-soft p-3">
                  <p className="font-pixel text-xs text-critical">{row.kind}</p>
                  <p className="mt-1 font-semibold">{row.title}</p>
                  <p className="font-mono text-[13px] text-muted">{row.route}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-[15px]">
              <Bot aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {t.proof.agent}
            </p>
          </figure>
        </Reveal>
      </section>

      {/* ---------- quem está por trás: uma pessoa, não uma marca sem rosto ---------- */}
      <section aria-labelledby="founder-heading" className="container-page pb-20 sm:pb-28">
        <Reveal className="mx-auto grid max-w-3xl gap-8 rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:grid-cols-[auto_1fr] sm:p-10">
          <Image src="/founder/valmir.jpg" alt={t.founder.photoAlt} width={112} height={112} className="h-24 w-24 rounded-md border border-line-strong object-cover sm:h-28 sm:w-28" />
          <div>
            <p className="eyebrow">{t.founder.eyebrow}</p>
            <h2 id="founder-heading" className="mt-3 text-2xl font-bold sm:text-3xl">
              {t.founder.title}
            </h2>
            <div className="mt-4 space-y-4 text-lg text-muted">
              <p>{t.founder.p1}</p>
              <p className="text-ink">{t.founder.p2}</p>
              <p>{t.founder.p3}</p>
            </div>
            <p className="mt-5 font-semibold">{t.founder.sign}</p>
          </div>
        </Reveal>
      </section>

      {/* ---------- 5. Founding Customers (pré-lançamento, nada cobrado hoje) ---------- */}
      <section id={PRICING_ANCHOR} aria-labelledby="pricing-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">{t.founding.eyebrow}</p>
            <h2 id="pricing-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.founding.title}
            </h2>
            <p className="mt-4 text-lg text-muted">{t.founding.sub}</p>
          </Reveal>
          <div className="relative mx-auto mt-12 flex max-w-2xl flex-col rounded-md border-2 border-action bg-card p-6 shadow-pixel-lg sm:p-8">
            <p className="absolute -top-4 left-6 inline-flex items-center gap-2 border-2 border-action bg-bg px-3 py-0.5 font-pixel text-sm uppercase tracking-[0.06em] text-accent">
              <span aria-hidden="true" className="h-2 w-2 bg-action" />
              {t.founding.badge}
            </p>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              {/* o preço vem do Stripe (/api/founding/price): a home continua estática */}
              <p className="flex min-h-12 flex-wrap items-baseline gap-x-2">
                <FoundingPriceAmount locale={locale} />
                <span className="text-[15px] text-muted">{t.founding.afterLaunch}</span>
              </p>
              <span className="border-2 border-success px-2.5 py-0.5 font-pixel text-base text-success">{t.founding.today}</span>
            </div>
            <p className="mt-5 font-semibold">{t.founding.perksTitle}</p>
            <ul className="mt-3 grid gap-3">
              {t.founding.perks.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                    <PixelIcon name="star" size={14} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 border-l-4 border-action bg-accent-soft px-4 py-3 text-[15px]">
              <p className="font-semibold">{t.founding.zero}</p>
              <p className="mt-1">{t.founding.notYet}</p>
            </div>

            <h3 className="mt-6 font-semibold">{t.founding.howTitle}</h3>
            <ol className="mt-3 grid gap-3 text-[15px]">
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">01</span>
                <span>{t.founding.step1}</span>
              </li>
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">02</span>
                <span>{t.founding.step2}</span>
              </li>
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">03</span>
                <span>
                  <strong>{t.founding.step3a}</strong> <FoundingPriceText locale={locale} />
                  {t.founding.step3b}
                </span>
              </li>
            </ol>

            <div className="mt-7">
              <FoundingCheckoutButton label={t.founding.reserve} locale={locale} />
            </div>
            <p className="mt-3 text-sm text-muted">
              {t.founding.secure} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>{t.founding.terms}</Link>.
            </p>
            <Link href={to(FOUNDING_PATH)} data-cta="home_founding_details" className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold">
              {t.founding.details}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 6. stillworks: o núcleo open source ---------- */}
      <section id="open-source" aria-labelledby="open-heading" className="container-page py-20 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{t.stillworks.eyebrow}</p>
          <h2 id="open-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.stillworks.title}
          </h2>
          <div className="mt-4 space-y-4 text-lg text-muted">
            <p>{t.stillworks.p1}</p>
            <p className="text-ink">{t.stillworks.p2}</p>
          </div>
          <a href={stillworksLink("home_open_source")} data-cta="open_core_github" className={buttonClasses("secondary", "lg", "mt-7")}>
            {t.stillworks.cta}
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </Reveal>
      </section>

      {/* ---------- feedback sobre a proposta: vai para o fundador ---------- */}
      <section id="feedback" aria-labelledby="feedback-heading" className="border-y border-line bg-surface">
        <div className="container-page grid items-start gap-10 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
          <Reveal>
            <p className="eyebrow">{t.feedback.eyebrow}</p>
            <h2 id="feedback-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.feedback.title}
            </h2>
            <p className="mt-4 text-lg text-muted">{t.feedback.sub}</p>
            <p className="mt-4 text-lg">{t.feedback.body}</p>
          </Reveal>
          <FeedbackForm locale={locale} />
        </div>
      </section>

      {/* ---------- 7. dúvidas ---------- */}
      <section id="faq" aria-labelledby="faq-heading" className="container-page pt-20 sm:pt-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <h2 id="faq-heading" className="text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.faqTitle}
          </h2>
          <FaqList items={t.faq} />
        </div>
      </section>

      {/* ---------- 8. convite final, com a lista de espera para quem só quer acompanhar ---------- */}
      <section id="early-access" aria-labelledby="final-heading" className="container-page py-20 sm:py-28">
        <div className="grid items-start gap-10 rounded-md border border-line-strong bg-card p-6 shadow-[6px_6px_0_0_var(--line)] sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
          <div>
            <h2 id="final-heading" className="text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.final.title}
            </h2>
            <p className="mt-4 max-w-prose text-lg text-muted">{t.final.text}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={to("/check")} data-cta="final_check" className={buttonClasses("primary", "lg", "h-auto !whitespace-normal py-3")}>
                {t.final.check}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
              <Link href={to(FOUNDING_PATH)} data-cta="final_founding" className={buttonClasses("secondary", "lg", "h-auto !whitespace-normal py-3")}>
                {t.final.founding}
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t.final.waitlistTitle}</h3>
            <p className="mt-1 text-[15px] text-muted">{t.final.waitlistText}</p>
            <WaitlistCount className="mb-3 mt-3" locale={locale} />
            <WaitlistForm form="early_access" submitLabel={t.final.submit} layout="stacked" locale={locale} />
          </div>
        </div>
      </section>
    </div>
  );
}
