import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Check, X } from "lucide-react";
import { HandNote, PenCheck, PenCircle, PenUnderline, PostIt } from "@/components/hand/Pen";
import { Logo } from "@/components/Logo";
import { ReelFrame } from "@/components/landing/ReelFrame";
import { PricingCards } from "@/components/PricingCards";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { localePath } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { analyses } from "@/lib/fixtures";
import { formatTimestamp } from "@/lib/format";
import { guidesIn } from "@/lib/guides";
import { OFFER } from "@/lib/pricing";
import { jsonLd, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
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

/** O título de cada seção: a nota à mão em cima, o título grande embaixo. */
function SectionHeading({ eyebrow, title, lead, center = false }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-[760px] text-center" : "max-w-[680px]"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 whitespace-pre-line font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-[56px]">{title}</h2>
      {lead && <p className={cn("mt-5 text-[17px] leading-relaxed text-ink-muted sm:text-[19px]", center && "mx-auto max-w-[60ch]")}>{lead}</p>}
    </Reveal>
  );
}

interface Line {
  time: string;
  text: string;
  mark: "cut" | "drop" | "keep" | "";
  /** a nota da caneta na margem daquela linha (vazia: a linha passa sem comentário) */
  note: string;
}

/* as etiquetas de "pra quem é": coladas meio tortas, como no caderno */
const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-1"];

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const c = await getTranslations("Landing.caderno");
  const cp = await getTranslations("Landing.copilot");
  const w = await getTranslations("Landing.withYou");
  const who = await getTranslations("Landing.forWho");
  const tCommon = await getTranslations("Common");
  const dropTime = formatTimestamp(sample.dropAtSec);
  // a última palavra antes do círculo ("We", "gente", "lo") anda junto com ele
  const titleStart = c("titleStart");
  const titleCut = titleStart.trimEnd().lastIndexOf(" ") + 1;
  const titleHead = titleStart.slice(0, titleCut);
  const titleTail = titleStart.slice(titleCut);
  const benefits = t.raw("hero.benefits") as string[];
  const lines = c.raw("lines") as Line[];
  const notes = cp.raw("notes") as string[];
  const aiItems = w.raw("aiItems") as string[];
  const youItems = w.raw("youItems") as string[];
  const uses = who.raw("uses") as string[];
  const flow = t.raw("moments.steps") as { title: string; text: string }[];
  const lost = Math.round(sample.retention[sample.dropAtSec][1] - sample.retention[sample.dropAtSec + 2][1]);
  const loopTime = formatTimestamp(loopSample.prediction.atSecond);
  const loopDiff = Math.round((loopSample.prediction.actual ?? 0) - loopSample.prediction.predicted);
  const locale = await getLocale();
  const tSeo = await getTranslations("Seo.home");
  const tPricing = await getTranslations("Pricing");
  const home = `${SITE_URL}${localePath(locale, "/")}`;
  const hasGuides = guidesIn(locale).length > 0;
  const tryHref = localePath(locale, "/experimentar");

  // o que o Google lê sobre o produto: quem faz, o que é, quanto custa e as dúvidas da página
  const structured = [
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg`, email: SUPPORT_EMAIL },
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: home, inLanguage: locale },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: home,
      description: tSeo("description"),
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      inLanguage: locale,
      offers: { "@type": "Offer", name: tPricing("planName"), price: OFFER.amount.toFixed(2), priceCurrency: OFFER.currency },
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
        {/* ---------- hero: a promessa com a palavra circulada e o Reel anotado à mão ---------- */}
        <section className="mx-auto grid max-w-page items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:px-8 lg:pb-28 lg:pt-16">
          <div>
            <Reveal>
              {/* o que o produto é, dito com todas as letras antes da metáfora */}
              {/* cada um na sua linha: lado a lado, a etiqueta e a nota desalinhavam em telas médias */}
              <div>
                <p className="inline-block rounded-[4px] bg-ink px-2.5 py-1 text-[12.5px] font-bold uppercase tracking-[0.08em] text-paper sm:text-[13px]">{c("kicker")}</p>
              </div>
              <div className="mt-4">
                <HandNote className="text-[26px] sm:text-[30px]">{c("pocket")}</HandNote>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-4 font-display text-[50px] font-extrabold leading-[0.98] tracking-[-0.05em] text-balance sm:text-[72px] lg:text-[64px] xl:text-[84px]">
                {titleHead}
                {/* a palavra circulada nunca abre a linha: o círculo vazaria para fora da margem */}
                <span className="whitespace-nowrap">
                  {titleTail}
                  <PenCircle strokeWidth={5}>{c("titleCircled")}</PenCircle>
                </span>
                {c("titleEnd")}
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-7 max-w-[50ch] text-[18px] leading-relaxed text-ink-muted sm:text-[20px]">{c("lead")}</p>
            </Reveal>
            <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={tryHref} className={buttonClasses("primary", "md", "min-h-14 px-7 text-[17px]")}>
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <HandNote className="text-[24px] text-ink-muted">{t("hero.ctaNote")}</HandNote>
            </Reveal>
            <Reveal as="ul" delay={240} className="mt-10 flex flex-col gap-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-[16.5px] font-medium">
                  <PenCheck className="h-6 w-6" />
                  {benefit}
                </li>
              ))}
            </Reveal>
          </div>

          {/* o Reel anotado: o vídeo, a frase riscada, o segundo circulado, a nota e o post-it.
              A partir do tablet, tudo é posicionado em proporção de uma caixa 520 × 640 (a mesma
              do desenho da caneta), então o círculo e a seta acertam o lugar em qualquer largura. */}
          <Reveal delay={150} className="relative mx-auto h-[600px] w-full max-w-[520px] sm:h-auto sm:aspect-[520/640]">
            <div className="absolute left-0 top-6 h-[560px] w-[280px] rounded-[40px] border-2 border-[#1e1b18] bg-[#1e1b18] p-2.5 shadow-stamp sm:top-[6.25%] sm:h-[87.5%] sm:w-[53.85%]">
              <ReelFrame phrase={t("hero.samplePhrase")} exampleLabel={t("mock.example")} />
            </div>
            {/* o segundo da queda, circulado, e a seta para a nota (a partir do tablet: no celular não cabe ao lado) */}
            <svg aria-hidden="true" viewBox="0 0 520 640" className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible text-accent sm:block">
              <path className="pen-draw" pathLength={1} d="M9 581 C -15 557, 3 519, 41 517 C 87 515, 101 561, 69 585 C 47 601, 11 597, -1 575" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path className="pen-draw" pathLength={1} d="M100 578 C 190 616, 280 596, 318 512" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path className="pen-draw" pathLength={1} d="M298 520 L 320 509 L 320 534" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {/* a coluna da direita: o post-it no alto e a nota da caneta embaixo, na mesma margem */}
            <PostIt className="absolute right-0 top-0 w-[170px] sm:left-[60%] sm:right-auto sm:top-[6.25%] sm:w-[37.7%]">
              <span className="font-hand text-[22px] font-semibold leading-none">{c("tryInstead")}</span>
              <p className="mt-1 font-hand text-[24px] font-bold leading-[1.05]">{c("sampleRewrite")}</p>
            </PostIt>
            <HandNote as="p" className="absolute left-[60%] top-[58%] hidden w-[37.7%] text-[25px] sm:block">
              {c("dropNote", { time: dropTime, lost })}
            </HandNote>
          </Reveal>
        </section>

        {/* ---------- o copiloto: um segundo par de olhos revisando o vídeo, como um editor faria ----------
            Três colunas da mesma página: o que ele viu (a transcrição com as notas na margem), o que
            ele sugere e, por último, a decisão, que é sempre de quem fez o vídeo. */}
        <section id="exemplo" className="scroll-mt-20 border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
            <SectionHeading eyebrow={cp("eyebrow")} title={cp("title")} lead={cp("lead")} />
            <Reveal delay={120} className="mt-14 grid overflow-hidden rounded-[28px] border-2 border-ink bg-paper-raised shadow-[8px_8px_0_var(--ink)] lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="p-5 sm:p-9">
                <p className="t-label">{cp("watchLabel")}</p>
                <ol className="mt-4">
                  {lines.map((line) => (
                    <li key={line.time} className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex min-w-0 gap-4 text-[17px] leading-snug sm:text-[18.5px]">
                        <span className="w-10 shrink-0 pt-0.5 text-[14px] font-semibold tabular-nums text-ink-muted">{line.time}</span>
                        <span className={line.mark === "cut" || line.mark === "drop" ? "pen-strike" : line.mark === "keep" ? "marker" : undefined}>{line.text}</span>
                      </div>
                      {/* no celular a nota desce para baixo da frase, no mesmo tamanho: continua legível */}
                      {line.note && (
                        <HandNote className={cn("ml-14 text-[22px] sm:ml-auto sm:max-w-[13em] sm:shrink-0 sm:text-right sm:text-[23px]", line.mark === "keep" && "!text-kraft-ink")}>
                          {line.note}
                        </HandNote>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="flex flex-col gap-5 border-t-2 border-dashed border-line bg-paper p-5 sm:p-8 lg:border-l-2 lg:border-t-0">
                <p className="t-label">{cp("notesLabel")}</p>
                <div>
                  <HandNote className="text-[22px] !text-ink-muted">{cp("tryInstead")}</HandNote>
                  <ol className="mt-3 flex flex-col gap-3">
                    {notes.map((note, index) => (
                      <li key={note}>
                        <HandNote className="rotate-0 text-[26px]">
                          {index + 1}. {note}
                        </HandNote>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="mt-auto rounded-2xl border-2 border-ink bg-ink p-5 text-paper">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] opacity-75">{cp("decideLabel")}</p>
                  <p className="mt-1 text-[18px] font-bold tracking-[-0.02em]">{cp("decideSummary")}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[14px] font-semibold">
                    <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-paper px-3 py-1 text-ink">
                      <Check size={14} strokeWidth={3} aria-hidden="true" />
                      {cp("accepted")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-current px-3 py-1 opacity-80">
                      <X size={14} strokeWidth={3} aria-hidden="true" />
                      {cp("skipped")}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] opacity-75">{cp("finalEdit")}</p>
                </div>
              </aside>
            </Reveal>
          </div>
        </section>

        {/* ---------- a promessa central: a IA edita com você, não por você ---------- */}
        <section className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
          <Reveal>
            <p className="eyebrow">{w("eyebrow")}</p>
            <h2 className="mt-4 font-display text-[44px] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[72px] xl:text-[88px]">
              {w("line1Start")}
              {/* a palavra circulada e o fim da frase não se separam na quebra de linha */}
              <span className="whitespace-nowrap">
                <PenCircle strokeWidth={5} className="mx-[0.08em]">
                  {w("line1Word")}
                </PenCircle>
                {w("line1End")}
              </span>
              <br />
              <span className="text-ink-muted">
                {w("line2Start")}
                <span className="pen-strike [text-decoration-thickness:0.09em]">{w("line2Word")}</span>
                {w("line2End")}
              </span>
            </h2>
          </Reveal>
          <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <Reveal delay={60}>
              <p className="max-w-[48ch] text-[19px] leading-relaxed sm:text-[21px]">{w("lead")}</p>
            </Reveal>
            {/* quem faz o quê: a caneta aponta, a decisão fica do lado de quem fez o vídeo */}
            <Reveal delay={120}>
              <div className="grid grid-cols-2 overflow-hidden rounded-[24px] border-2 border-ink bg-paper-raised shadow-stamp">
                <div className="p-5 sm:p-7">
                  <p className="font-hand text-[28px] font-bold leading-none text-accent">{w("aiLabel")}</p>
                  <ul className="mt-5 flex flex-col gap-3 text-[15.5px] font-medium leading-snug sm:text-[17px]">
                    {aiItems.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="font-hand text-[20px] font-bold leading-[0.9] text-accent">
                          →
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-l-2 border-dashed border-line bg-kraft-soft p-5 sm:p-7">
                  <p className="font-hand text-[28px] font-bold leading-none text-kraft-ink">{w("youLabel")}</p>
                  <ul className="mt-5 flex flex-col gap-3 text-[15.5px] font-bold leading-snug sm:text-[17px]">
                    {youItems.map((item) => (
                      <li key={item} className="flex gap-2">
                        <PenCheck className="mt-px h-5 w-5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <HandNote as="p" className="ml-2 mt-6 text-[26px]">
                {w("note")} ✓
              </HandNote>
            </Reveal>
          </div>
        </section>

        {/* ---------- pra quem é: quem já edita e só quer saber o que vale mudar ---------- */}
        <section className="border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto grid max-w-page items-center gap-12 px-5 py-24 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
            <Reveal>
              <p className="eyebrow">{who("eyebrow")}</p>
              <h2 className="mt-3 font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-[56px]">{who("title")}</h2>
              <p className="mt-6 text-[19px] font-semibold leading-snug sm:text-[22px]">
                {who("lead1")}
                <br />
                <span className="marker">{who("lead2")}</span>
              </p>
            </Reveal>
            <Reveal delay={120}>
              <HandNote className="text-[26px]">{who("usesNote")}</HandNote>
              <ul className="mt-5 flex flex-wrap gap-3">
                {uses.map((use, index) => (
                  <li
                    key={use}
                    className={cn(
                      "rounded-[6px] border-2 border-ink px-4 py-2 text-[16px] font-bold shadow-[3px_3px_0_var(--ink)] sm:text-[19px]",
                      index % 2 === 0 ? "bg-paper" : "bg-kraft-soft",
                      TILT[index % TILT.length],
                    )}
                  >
                    {use}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------- como funciona: do upload ao post, com a decisão circulada no meio ---------- */}
        <section id="como-funciona" className="mx-auto max-w-page scroll-mt-20 px-5 py-24 lg:px-8 lg:py-28">
          <SectionHeading eyebrow={t("moments.eyebrow")} title={t("moments.title")} />
          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {flow.map((step, index) => {
              const yours = index === 4;
              const number = String(index + 1).padStart(2, "0");
              return (
                <Reveal as="li" key={step.title} delay={(index % 3) * 90} className={cn("rounded-[24px] border-2 border-ink p-6 shadow-stamp sm:p-7", yours ? "bg-kraft-soft" : "bg-paper-raised")}>
                  <span className="font-hand text-[54px] font-bold leading-none text-accent">{yours ? (
                      <PenCircle strokeWidth={3.5}>
                        <span className="px-2">{number}</span>
                      </PenCircle>
                    ) : (
                      number
                    )}</span>
                  <h3 className="mt-4 text-[22px] font-extrabold leading-snug tracking-[-0.03em]">{yours ? <PenUnderline>{step.title}</PenUnderline> : step.title}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{step.text}</p>
                </Reveal>
              );
            })}
          </ol>
        </section>

        {/* ---------- as sete frentes: o checklist do editor ---------- */}
        <section className="border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto grid max-w-page gap-12 px-5 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-8 lg:py-28">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading eyebrow={t("plan.eyebrow")} title={t("plan.title")} lead={t("plan.lead")} />
              <Reveal delay={120}>
                <Link href={tryHref} className={buttonClasses("primary", "md", "mt-8 min-h-12 px-6")}>
                  {t("hero.cta")}
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </Link>
              </Reveal>
            </div>
            <ul className="flex flex-col">
              {FRONTS.map((kind, index) => {
                const { title, body } = splitItem(t(`plan.items.${kind}`));
                return (
                  <Reveal as="li" key={kind} delay={(index % 4) * 60} className="flex gap-4 border-b border-line py-5 first:pt-0">
                    <PenCheck className="mt-1 h-7 w-7" />
                    <div>
                      <h3 className="text-[23px] font-extrabold tracking-[-0.03em]">{title}</h3>
                      {body && <p className="mt-1 text-[16px] leading-relaxed text-ink-muted">{body}</p>}
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- a previsão que se confere no Insights: num post-it ---------- */}
        <section className="mx-auto grid max-w-page items-center gap-14 px-5 py-24 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-28">
          <div>
            <SectionHeading eyebrow={t("loop.eyebrow")} title={t("loop.title")} />
            <Reveal delay={100}>
              <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed">{t("loop.text1")}</p>
              <p className="mt-4 max-w-[54ch] text-[16.5px] leading-relaxed text-ink-muted">{t("loop.text2")}</p>
            </Reveal>
          </div>
          {/* um ciclo fechado de verdade (fixture), rotulado como exemplo e com a métrica dita por extenso */}
          <Reveal delay={160}>
            <PostIt className="mx-auto max-w-[460px] -rotate-2 p-8 sm:p-10">
              <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#5c544b]">
                {t("loop.metric", { time: loopTime })} · {t("loop.sampleTag")}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-6 text-[#1e1b18]">
                <div>
                  <p className="font-hand text-[26px] font-semibold leading-none">{t("loop.predicted")}</p>
                  <p className="mt-2 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{loopSample.prediction.predicted}%</p>
                </div>
                <div>
                  <p className="font-hand text-[26px] font-semibold leading-none">{t("loop.actual")}</p>
                  <p className="mt-2 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums text-[#1f47a6]">
                    <PenCircle strokeWidth={4}>{loopSample.prediction.actual}%</PenCircle>
                  </p>
                </div>
              </div>
              <p className="mt-7 text-[15px] font-semibold text-[#1e1b18]">{t("loop.sampleVerdict", { diff: loopDiff })}</p>
              <HandNote className="mt-2 text-[34px] !text-[#1f47a6]">{c("hit")}</HandNote>
            </PostIt>
          </Reveal>
        </section>

        {/* ---------- a oferta ---------- */}
        <section id="precos" className="scroll-mt-20 border-y-2 border-ink bg-paper-raised">
          <div className="mx-auto max-w-page px-5 py-24 lg:px-8 lg:py-28">
            <PricingCards centered onceNote={c("onceNote")} />
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="mx-auto grid max-w-page gap-10 px-5 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-8 lg:py-28">
          <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          <Reveal delay={120} className="border-t-2 border-dashed border-line lg:mt-2">
            {(["1", "2", "3"] as const).map((n) => (
              <details key={n} className="group border-b-2 border-dashed border-line py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[21px] font-extrabold tracking-[-0.03em] sm:text-[23px]">
                  {t(`faq.q${n}`)}
                  <span aria-hidden="true" className="font-hand text-[34px] font-bold leading-none text-accent transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-[64ch] text-[16.5px] leading-relaxed text-ink-muted">{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* ---------- o último convite: a capa do caderno ---------- */}
        <section className="mx-auto max-w-page px-5 pb-24 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-[32px] border-2 border-ink bg-[#1e1b18] px-6 py-16 text-[#f6f0e4] shadow-[8px_8px_0_var(--kraft)] sm:px-14 sm:py-20">
            <div className="max-w-[720px]">
              <HandNote className="text-[30px] !text-[#9db5ff]">{c("trust")}</HandNote>
              <h2 className="mt-4 font-display text-[42px] font-extrabold leading-[1.02] tracking-[-0.05em] text-balance sm:text-[64px]">{t("final.title")}</h2>
              <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed opacity-80">{t("final.lead")}</p>
              <Link
                href={tryHref}
                className="mt-9 inline-flex min-h-14 items-center gap-2 rounded-[14px] border-2 border-[#f6f0e4] bg-[#1f47a6] px-7 text-[17px] font-bold text-white shadow-[4px_4px_0_#f6f0e4] transition-transform duration-150 hover:-translate-x-px hover:-translate-y-px hover:no-underline"
              >
                {t("hero.cta")}
                <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <p className="mt-4 text-[14px] opacity-70">{t("hero.ctaNote")}</p>
            </div>
          </Reveal>
        </section>

        <footer className="border-t-2 border-ink bg-paper-raised">
          <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-8">
            <div>
              <Logo size="sm" label={tCommon("brand")} />
              <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-ink-muted">{t("footer")}</p>
            </div>
            <nav aria-label={t("footerCols.product")}>
              <p className="text-[14px] font-bold">{t("footerCols.product")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <li>
                  <Link href={tryHref} className="text-ink-muted hover:text-ink">
                    {t("footerCols.try")}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/planos")} className="text-ink-muted hover:text-ink">
                    {tCommon("plans")}
                  </Link>
                </li>
                {hasGuides && (
                  <li>
                    <Link href={localePath(locale, "/guias")} className="text-ink-muted hover:text-ink">
                      {tCommon("guides")}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            <nav aria-label={t("footerCols.company")}>
              <p className="text-[14px] font-bold">{t("footerCols.company")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <li>
                  <Link href={localePath(locale, "/partners")} className="text-ink-muted hover:text-ink">
                    {t("partners.cta")}
                  </Link>
                </li>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ink-muted hover:text-ink">
                    {tCommon("support")}
                  </a>
                </li>
              </ul>
            </nav>
            <nav aria-label={t("footerCols.legal")}>
              <p className="text-[14px] font-bold">{t("footerCols.legal")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <li>
                  <Link href={localePath(locale, "/privacidade")} className="text-ink-muted hover:text-ink">
                    {tCommon("privacy")}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/termos")} className="text-ink-muted hover:text-ink">
                    {tCommon("terms")}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-page px-5 py-5 text-[13px] text-ink-muted lg:px-8">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
