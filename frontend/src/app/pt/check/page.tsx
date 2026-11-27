import type { Metadata } from "next";
import { CHECK_COPY, CheckLanding } from "@/components/check/CheckLanding";
import { SITE_NAME } from "@/lib/site";

const { title, description } = CHECK_COPY.pt.meta;

export const metadata: Metadata = {
  title: { absolute: `${title} · ${SITE_NAME}` },
  description,
  alternates: { canonical: "/pt/check", languages: { "en-US": "/check", "pt-BR": "/pt/check" } },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "pt_BR", url: "/pt/check", title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function CheckPagePt() {
  return <CheckLanding locale="pt" />;
}
