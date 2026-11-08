import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalyticsInit } from "@/components/AnalyticsInit";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const DESCRIPTION = "Free accessibility scanner for Shopify stores. Find WCAG 2.2 AA issues commonly cited in ADA lawsuits, with plain-English fixes, in about a minute.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Shopify accessibility scanner. ${TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", title: `${SITE_NAME}: ${TAGLINE}`, description: DESCRIPTION, url: SITE_URL },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${TAGLINE}`, description: DESCRIPTION },
  alternates: { canonical: "/" },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070a14" },
  ],
  colorScheme: "light dark",
};

/** O esqueleto acessível: link para pular ao conteúdo, cabeçalho, <main> focável e rodapé. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script do <head> muda data-theme e a classe "js" antes do React
    <html lang="en-US" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <AnalyticsInit />
      </body>
    </html>
  );
}
