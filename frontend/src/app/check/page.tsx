import type { Metadata } from "next";
import { CHECK_COPY, CheckLanding } from "@/components/check/CheckLanding";
import { SITE_NAME } from "@/lib/site";

const { title, description } = CHECK_COPY.en.meta;

export const metadata: Metadata = {
  title: { absolute: `${title} · ${SITE_NAME}` },
  description,
  alternates: { canonical: "/check", languages: { "en-US": "/check", "pt-BR": "/pt/check" } },
  openGraph: { siteName: SITE_NAME, type: "website", url: "/check", title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function CheckPage() {
  return <CheckLanding locale="en" />;
}
