import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { HOME_COPY } from "@/content/home";
import { SITE_NAME } from "@/lib/site";

const t = HOME_COPY.pt.meta;

export const metadata: Metadata = {
  title: { absolute: `${t.title} · ${SITE_NAME}` },
  description: t.description,
  alternates: { canonical: "/pt", languages: { "en-US": "/", "pt-BR": "/pt" } },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "pt_BR", url: "/pt", title: t.title, description: t.description },
  twitter: { card: "summary_large_image", title: t.title, description: t.description },
};

export default function HomePt() {
  return <HomePage locale="pt" />;
}
