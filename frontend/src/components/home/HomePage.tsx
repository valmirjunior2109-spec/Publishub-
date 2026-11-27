import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, Bug, Check, Clock3, EyeOff, FileWarning, FlaskConical, GitCompareArrows, GitPullRequest, ListChecks, Minus, Plug, Route, ScanEye, ShieldQuestion, Tag, UserX, Waypoints } from "lucide-react";
import { CheckStatsLine } from "@/components/check/CheckStatsLine";
import { FaqList } from "@/components/FaqList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Reveal } from "@/components/Reveal";
import { buttonClasses } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/Pixel";
import { FoundingCheckoutButton } from "@/components/waitlist/FoundingCheckoutButton";
import { FoundingPriceAmount, FoundingPriceText } from "@/components/waitlist/FoundingPrice";
import { StillworksBanner } from "@/components/waitlist/StillworksBanner";
import { TerminalPreview } from "@/components/waitlist/TerminalPreview";
import { WaitlistCount } from "@/components/waitlist/WaitlistCount";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { HOME_COPY } from "@/content/home";
import { FOUNDING_TERMS_ANCHOR, PRICING_ANCHOR, STILLWORKS_URL } from "@/lib/founding";
import { HTML_LANG, localePath, type Locale } from "@/lib/i18n";
import { SUPPORT_EMAIL } from "@/lib/site";

/** A home nos dois idiomas: a estrutura é a mesma, os textos vêm de content/home.tsx. */

const PROBLEM_ICONS = [Bug, GitCompareArrows, Route, Clock3, ShieldQuestion];
const STEP_ICONS = [Plug, ScanEye, Waypoints, FileWarning];
const SAFETY_ICONS = [EyeOff, FlaskConical, Tag, ListChecks, UserX, GitPullRequest];

const enter = (delay: number) => ({ "--enter-delay": `${delay}ms` }) as CSSProperties;

export function HomePage({ locale }: { locale: Locale }) {
  const t = HOME_COPY[locale];
  const to = (path: string) => localePath(locale, path);

  return (
    <div lang={HTML_LANG[locale]}>
      <WaitlistTracker />
      <StillworksBanner locale={locale} />

      {/* ---------- hero: a promessa, a inscrição e o produto logo abaixo ---------- */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line">
        <div className="landing-grid" aria-hidden="true" />
        <div className="landing-beam" aria-hidden="true" />
        <div className="container-page relative pt-14 text-center sm:pt-20">
          <a href="#early-access" data-cta="hero_pill" className="enter pill min-h-8 font-pixel text-[15px] no-underline hover:border-accent hover:text-ink" style={enter(0)}>
            <span aria-hidden="true" className="h-2 w-2 bg-action" />
            {t.hero.pill}
            <span aria-hidden="true" className={locale === "pt" ? "hidden text-muted sm:inline" : "hidden text-muted min-[380px]:inline"}>
              ·
            </span>
            <span className={locale === "pt" ? "hidden text-muted sm:inline" : "hidden text-muted min-[380px]:inline"}>{t.hero.pillSub}</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
          </a>
          <h1 id="hero-heading" className="enter mx-auto mt-6 max-w-5xl text-[2.5rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[4rem]" style={enter(80)}>
            {/* uma frase por linha no desktop; no celular, quebra onde couber */}
            <span className="text-muted sm:block">{t.hero.h1a}</span>{" "}
            <span className="sm:block">
              {t.hero.h1b}
              <span aria-hidden="true" className="term-cursor ml-[0.15em]" style={{ "--d": "900ms" } as CSSProperties} />
            </span>
          </h1>
          <p className="enter mx-auto mt-6 max-w-[58ch] text-lg text-muted sm:text-xl" style={enter(160)}>
            {t.hero.sub}
          </p>
          <div className="enter mx-auto mt-9 max-w-xl" style={enter(240)}>
            <WaitlistForm form="hero" submitLabel={t.hero.join} layout="inline" locale={locale} />
          </div>
          {/* quem está por trás e quantos já entraram, no momento da decisão */}
          <div className="enter mx-auto mt-5 flex max-w-xl items-center justify-center gap-3 text-left" style={enter(280)}>
            <Image src="/founder/valmir.jpg" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-sm border border-line-strong object-cover" />
            <p className="text-[15px] text-muted">
              {t.hero.builtBy}{" "}
              <a href="#founder-heading" data-cta="hero_founder" className="font-semibold text-ink">
                Valmir
              </a>
              {t.hero.builtByAfter} <WaitlistCount as="span" locale={locale} />
            </p>
          </div>
          <div className="enter mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[15px] text-muted" style={enter(320)}>
            <p>
              {t.hero.builtFor} <span className="font-mono text-[14px] text-ink">Claude Code · Cursor · Codex · Lovable</span>
            </p>
            <a href={STILLWORKS_URL} data-cta="hero_stillworks" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent no-underline hover:text-ink">
              {t.hero.stillworks}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <Link href={to("/check")} data-cta="hero_check" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent no-underline hover:text-ink">
              {t.hero.check}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* o produto, logo abaixo da inscrição: entra inclinado e assenta (uma vez) */}
        <div id="preview" className="container-page relative mt-10 pb-16 sm:mt-12 sm:pb-24">
          <div className="preview-stage">
            <div className="preview-tilt" lang="en-US">
              <TerminalPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- o problema ---------- */}
      <section aria-labelledby="problem-heading" className="container-page py-20 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{t.problem.eyebrow}</p>
          <h2 id="problem-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.problem.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.problem.sub}</p>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {t.problem.items.map(({ title, text }, i) => {
            const Icon = PROBLEM_ICONS[i];
            return (
              <li key={title} className="bg-card p-6">
                <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{text}</p>
              </li>
            );
          })}
          <li className="flex flex-col justify-center bg-card p-6">
            <p className="text-lg font-semibold">{t.problem.closing}</p>
            <a href="#early-access" data-cta="problem_join" className="mt-3 inline-flex min-h-11 items-center font-semibold">
              {t.problem.join}
            </a>
          </li>
        </ul>
      </section>

      {/* ---------- a noite de quem constrói sozinho ---------- */}
      <section aria-labelledby="night-heading" className="border-y border-line bg-surface">
        <div className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">{t.night.eyebrow}</p>
            <h2 id="night-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.night.title}
            </h2>
            <p className="mt-4 text-lg text-muted">{t.night.sub}</p>
            <p className="mt-4 text-lg">{t.night.body}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={to("/check")} data-cta="night_check" className={buttonClasses("primary", "lg")}>
                {t.night.check}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="#early-access" data-cta="night_join" className={buttonClasses("secondary", "lg")}>
                {t.night.join}
              </a>
            </div>
            <CheckStatsLine className="mt-5" locale={locale} />
          </Reveal>
          <Reveal>
            <ol aria-label={t.night.label} className="relative space-y-6 border-l-2 border-line-strong pl-6">
              {t.night.timeline.map(({ time, text }, index) => (
                <li key={time} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[33px] top-1.5 h-4 w-4 rounded-sm ${index >= 2 ? "bg-critical" : "bg-action"}`} />
                  <p className="font-pixel text-sm text-muted">{time}</p>
                  <p className={`mt-1 text-lg ${index >= 2 ? "font-semibold" : ""}`}>{text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ---------- a objeção: "por que não pedir para o agente testar?" ---------- */}
      <section aria-labelledby="why-heading" className="container-page pb-20 sm:pb-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{t.why.eyebrow}</p>
          <h2 id="why-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.why.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.why.sub}</p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6 sm:p-7">
            <h3 className="text-lg font-semibold">{t.why.agentTitle}</h3>
            <ul className="mt-5 grid gap-3">
              {t.why.agent.map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted">
                  <Minus aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-action bg-card p-6 sm:p-7">
            <h3 className="text-lg font-semibold">{t.why.usTitle}</h3>
            <ul className="mt-5 grid gap-3">
              {t.why.us.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- seguro no app real: o que mudou depois do feedback da comunidade ---------- */}
      <section id="safe-on-live" aria-labelledby="safe-heading" className="container-page pb-20 sm:pb-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{t.safety.eyebrow}</p>
          <h2 id="safe-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.safety.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.safety.sub}</p>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {t.safety.items.map(({ title, text }, i) => {
            const Icon = SAFETY_ICONS[i];
            return (
              <li key={title} className="bg-card p-6">
                <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{text}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 flex items-start gap-3 text-[15px] text-muted">
          <BellRing aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          {t.safety.alert}
        </p>
      </section>

      {/* ---------- como vai funcionar ---------- */}
      <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{t.how.eyebrow}</p>
            <h2 id="how-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.how.title}
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.how.steps.map(({ title, text }, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <Reveal as="li" key={title} delay={index * 90} className="relative rounded-2xl border border-line bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface">
                      <Icon className="h-5 w-5 text-accent" />
                    </span>
                    <span className="font-pixel text-base text-accent">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-muted">{text}</p>
                </Reveal>
              );
            })}
          </ol>
          <p className="mt-8 max-w-prose text-[15px] text-muted">{t.how.note}</p>
        </div>
      </section>

      {/* ---------- quem está construindo: uma pessoa, não uma marca sem rosto ---------- */}
      <section aria-labelledby="founder-heading" className="container-page pt-20 sm:pt-28">
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

      {/* ---------- open core: StillWorks grátis, Publishub faz por você ---------- */}
      <section id="open-source" aria-labelledby="open-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{t.open.eyebrow}</p>
            <h2 id="open-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.open.title}
            </h2>
            <p className="mt-4 text-lg text-muted">{t.open.sub}</p>
          </Reveal>
          <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-card">
            <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-line-strong text-sm font-semibold sm:grid">
              <p className="p-4">&nbsp;</p>
              <p className="p-4">{t.open.colFree}</p>
              <p className="border-l-2 border-action p-4 text-accent">{t.open.colPaid}</p>
            </div>
            <dl>
              {t.open.rows.map(({ label, stillworks, publishub }) => (
                <div key={label} className="grid gap-1 border-b border-line p-4 last:border-b-0 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-0 sm:p-0">
                  <dt className="font-semibold sm:p-4">{label}</dt>
                  <dd className="text-muted sm:p-4">
                    <span className="font-semibold text-ink sm:hidden">StillWorks: </span>
                    {stillworks}
                  </dd>
                  <dd className="sm:border-l-2 sm:border-action sm:p-4">
                    <span className="font-semibold text-accent sm:hidden">Publishub: </span>
                    {publishub}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`#${PRICING_ANCHOR}`} data-cta="open_core_founding" className={buttonClasses("primary", "lg", "h-auto !whitespace-normal py-3")}>
              {t.open.reserve}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
            <a href={STILLWORKS_URL} data-cta="open_core_github" className={buttonClasses("secondary", "lg", "h-auto !whitespace-normal py-3")}>
              {t.open.github}
            </a>
          </div>
        </div>
      </section>

      {/* ---------- preços: a lista de espera grátis e a reserva Founding Customers (pré-lançamento, nada cobrado hoje) ---------- */}
      <section id={PRICING_ANCHOR} aria-labelledby="pricing-heading" className="container-page py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t.pricing.eyebrow}</p>
          <h2 id="pricing-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.pricing.sub}</p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col rounded-md border border-line-strong bg-card p-7 shadow-[6px_6px_0_0_var(--line)]">
            <h3 className="font-pixel text-2xl font-medium">{t.pricing.freeTitle}</h3>
            <p className="mt-4 text-5xl font-extrabold tracking-[-0.04em]">{t.pricing.free}</p>
            <p className="mt-3 text-muted">{t.pricing.freeSub}</p>
            <ul className="mt-6 grid gap-3">
              {t.pricing.freeItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={to("/#early-access")}
              data-cta="pricing_waitlist"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-line-strong bg-card px-6 font-semibold text-ink no-underline transition-colors hover:border-accent hover:bg-surface hover:text-ink"
            >
              {t.pricing.freeCta}
            </Link>
          </div>

          <div className="relative flex flex-col rounded-md border-2 border-action bg-card p-7 shadow-pixel-lg sm:p-8">
            <p className="absolute -top-4 left-6 inline-flex items-center gap-2 border-2 border-action bg-bg px-3 py-0.5 font-pixel text-sm uppercase tracking-[0.06em] text-accent">
              <span aria-hidden="true" className="h-2 w-2 bg-action" />
              {t.pricing.badge}
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-pixel text-2xl font-medium">{t.pricing.foundingTitle}</h3>
              <span className="border-2 border-success px-2.5 py-0.5 font-pixel text-base text-success">{t.pricing.today}</span>
            </div>
            {/* o preço vem do Stripe (/api/founding/price): a home continua estática */}
            <p className="mt-4 flex min-h-12 flex-wrap items-baseline gap-x-2">
              <FoundingPriceAmount locale={locale} />
              <span className="text-[15px] text-muted">{t.pricing.afterLaunch}</span>
            </p>
            <p className="mt-3 text-muted">{t.pricing.foundingSub}</p>
            <ul className="mt-6 grid gap-3">
              {t.pricing.perks.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                    <PixelIcon name="star" size={14} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 border-l-4 border-action bg-accent-soft px-4 py-3 text-[15px]">
              <p className="font-semibold">{t.pricing.notYet}</p>
              <p className="mt-1">{t.pricing.notYetText}</p>
            </div>

            <h4 className="mt-6 font-semibold">{t.pricing.howTitle}</h4>
            <ol className="mt-3 grid gap-3 text-[15px]">
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">01</span>
                <span>{t.pricing.step1}</span>
              </li>
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">02</span>
                <span>{t.pricing.step2}</span>
              </li>
              <li className="flex gap-3">
                <span className="font-pixel text-base text-accent">03</span>
                <span>
                  <strong>{t.pricing.step3a}</strong> <FoundingPriceText locale={locale} />
                  {t.pricing.step3b}
                </span>
              </li>
            </ol>

            <div className="mt-7">
              <FoundingCheckoutButton label={t.pricing.reserve} locale={locale} />
            </div>
            <p className="mt-3 text-sm text-muted">
              {t.pricing.secure} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. <Link href={`/terms#${FOUNDING_TERMS_ANCHOR}`}>{t.pricing.terms}</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- acesso antecipado ---------- */}
      <section id="early-access" aria-labelledby="early-heading" className="container-page py-20 sm:py-28">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
          <div>
            <p className="eyebrow">{t.early.eyebrow}</p>
            <h2 id="early-heading" className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              {t.early.title}
            </h2>
            <p className="mt-4 max-w-prose text-lg text-muted">{t.early.sub}</p>
            <ul className="mt-8 grid gap-3">
              {t.early.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[17px]">
                  <span aria-hidden="true" className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center border border-line bg-accent-soft text-accent">
                    <PixelIcon name="star" size={12} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-line-strong bg-card p-6 shadow-[6px_6px_0_0_var(--line)] sm:p-8">
            <WaitlistCount className="mb-4" locale={locale} />
            <WaitlistForm form="early_access" submitLabel={t.early.submit} layout="stacked" locale={locale} />
          </div>
        </div>
      </section>

      {/* ---------- feedback sobre a proposta: vai para copilot@getpublishub.com ---------- */}
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

      {/* ---------- perguntas ---------- */}
      <section id="faq" aria-labelledby="faq-heading" className="container-page pb-8 pt-20 sm:pt-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <h2 id="faq-heading" className="text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">
            {t.faqTitle}
          </h2>
          <FaqList items={t.faq} />
        </div>
      </section>
    </div>
  );
}
