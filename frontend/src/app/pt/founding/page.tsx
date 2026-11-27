import type { Metadata } from "next";
import { FoundingPage } from "@/components/founding/FoundingPage";
import { FOUNDING_COPY } from "@/content/founding";
import { SITE_NAME } from "@/lib/site";

const t = FOUNDING_COPY.pt.meta;

export const metadata: Metadata = {
  title: { absolute: `${t.title} · ${SITE_NAME}` },
  description: t.description,
  alternates: { canonical: "/pt/founding", languages: { "en-US": "/founding", "pt-BR": "/pt/founding" } },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "pt_BR", url: "/pt/founding", title: t.title, description: t.description },
  twitter: { card: "summary_large_image", title: t.title, description: t.description },
};

export default function FoundingPt() {
  return <FoundingPage locale="pt" />;
}
