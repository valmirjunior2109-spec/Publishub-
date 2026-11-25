import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistTracker } from "@/components/waitlist/WaitlistTracker";
import { GUIDES } from "@/lib/guides";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Guides: testing apps built with AI";
const DESCRIPTION = "Practical answers for people shipping with Lovable, Bolt, Cursor, Claude Code and v0: how to know your app still works after the AI changes it.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · ${SITE_NAME}` },
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: { siteName: SITE_NAME, type: "website", url: "/guides", title: TITLE, description: DESCRIPTION },
};

export default function GuidesPage() {
  return (
    <>
      <WaitlistTracker />
      <div className="container-page max-w-3xl py-12 sm:py-16">
        <p className="eyebrow">Guides</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-[2.75rem] sm:leading-[1.1]">Testing apps built with AI</h1>
        <p className="mt-4 text-lg text-muted">{DESCRIPTION}</p>
        <ul className="mt-10 space-y-4">
          {GUIDES.map((g) => (
            <li key={g.slug} className="rounded-md border border-line bg-card p-5">
              <Link href={`/guides/${g.slug}`} className="text-lg font-semibold">
                {g.title}
              </Link>
              <p className="mt-1.5 text-[15px] text-muted">{g.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
