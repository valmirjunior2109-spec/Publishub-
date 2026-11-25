import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckForm } from "@/components/check/CheckForm";
import { FaqList } from "@/components/FaqList";
import { buttonClasses } from "@/components/ui/Button";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// só os guias da lista existem; qualquer outro endereço é 404
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  const path = `/guides/${guide.slug}`;
  return {
    title: { absolute: `${guide.title} · ${SITE_NAME}` },
    description: guide.description,
    alternates: { canonical: path },
    openGraph: { siteName: SITE_NAME, type: "article", url: path, title: guide.title, description: guide.description },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  const url = `${SITE_URL}/guides/${guide.slug}`;

  // dados estruturados: o artigo e as perguntas, para buscadores e assistentes de IA
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      dateModified: guide.updated,
      mainEntityOfPage: url,
      author: { "@type": "Person", name: "Valmir Santos" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <>
      <WaitlistTracker />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="container-page max-w-3xl py-12 sm:py-16">
        <p className="eyebrow">
          <Link href="/guides" className="no-underline">
            Guides
          </Link>
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-[1.1] sm:text-[2.75rem]">{guide.title}</h1>
        <p className="mt-3 text-sm text-muted">
          Updated {new Date(`${guide.updated}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long" })} · by Valmir, founder of {SITE_NAME}
        </p>

        <div className="mt-8 rounded-md border-l-4 border-action bg-accent-soft p-5 sm:p-6">
          <p className="font-pixel text-sm text-accent">Short answer</p>
          <p className="mt-2 text-lg">{guide.answer}</p>
        </div>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="text-2xl font-bold sm:text-3xl">{section.heading}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text.slice(0, 40)} className="mt-4 text-lg text-muted">
                {text}
              </p>
            ))}
            {section.steps && (
              <ol className="mt-6 space-y-5">
                {section.steps.map((step, index) => (
                  <li key={step.title} className="rounded-md border border-line bg-card p-5">
                    <p className="flex items-baseline gap-3">
                      <span className="font-pixel text-base text-accent">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-lg font-semibold">{step.title}</span>
                    </p>
                    <p className="mt-2 text-[16px] text-muted">{step.text}</p>
                    {step.code && (
                      <pre className="terminal mt-3 overflow-x-auto rounded-md p-4 font-mono text-[13px] leading-relaxed">
                        <code>{step.code}</code>
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}

        <section aria-labelledby="check-heading" className="mt-14 rounded-md border border-line-strong bg-card p-6 shadow-[5px_5px_0_0_var(--line)] sm:p-8">
          <p className="eyebrow">Free tool · Report in about a minute</p>
          <h2 id="check-heading" className="mt-3 text-2xl font-bold">
            Check your app now, in about a minute
          </h2>
          <p className="mt-2 text-muted">Paste your app&apos;s URL. We open it in a real browser and show JavaScript crashes, failed requests and broken pages. Read-only: we never log in or submit forms.</p>
          <div className="mt-5">
            <CheckForm source={guide.source} />
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="mt-14">
          <h2 id="faq-heading" className="text-2xl font-bold sm:text-3xl">
            Questions
          </h2>
          <div className="mt-4">
            <FaqList items={guide.faq} />
          </div>
        </section>

        <section aria-labelledby="next-heading" className="mt-14 rounded-md border border-line-strong bg-surface p-6 sm:p-8">
          <h2 id="next-heading" className="text-2xl font-bold">
            Stop checking by hand after every AI change
          </h2>
          <p className="mt-3 text-muted">
            {SITE_NAME} is building the full version: your sign-up, login and checkout journeys, run in a real browser after every deploy and compared with the last version that worked. It&apos;s in
            development; the waitlist is open.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#early-access" data-cta={`${guide.source}_join`} className={buttonClasses("primary", "lg")}>
              Join the waitlist
            </Link>
            <Link href="/#pricing" data-cta={`${guide.source}_founding`} className={buttonClasses("secondary", "lg")}>
              Founding Customers: $0 today
            </Link>
          </div>
        </section>

        <nav aria-label="More guides" className="mt-14">
          <h2 className="text-xl font-bold">More guides</h2>
          <ul className="mt-4 space-y-2">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`}>{g.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </>
  );
}
