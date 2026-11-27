import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { HOME_COPY } from "@/content/home";
import { SITE_NAME } from "@/lib/site";
import { WAITLIST_PATH } from "@/lib/waitlist";

const t = HOME_COPY.en.meta;

export const metadata: Metadata = {
  title: { absolute: `${t.title} · ${SITE_NAME}` },
  description: t.description,
  alternates: { canonical: WAITLIST_PATH, languages: { "en-US": "/", "pt-BR": "/pt" } },
  openGraph: { siteName: SITE_NAME, type: "website", url: WAITLIST_PATH, title: t.title, description: t.description },
  twitter: { card: "summary_large_image", title: t.title, description: t.description },
};

export default function VerifyPage() {
  return <HomePage locale="en" />;
}
