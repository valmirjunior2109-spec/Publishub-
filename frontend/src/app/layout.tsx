import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import { AnalyticsInit } from "@/components/AnalyticsInit";
import { PathSwitch } from "@/components/PathSwitch";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WaitlistFooter, WaitlistHeader } from "@/components/waitlist/WaitlistChrome";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { PAYMENT_SUCCESS_PATH } from "@/lib/founding";
import { WAITLIST_PATH } from "@/lib/waitlist";

/** As páginas da Publishub (verificação de código), com cabeçalho e rodapé próprios. */
const PUBLISHUB_PAGES = [WAITLIST_PATH, PAYMENT_SUCCESS_PATH];
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// a fonte de pixel da marca: rótulos, selos e o nome, nunca texto corrido
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

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
  // o Midnight é o padrão da marca (o tema claro é opcional, no botão do cabeçalho)
  themeColor: "#020002",
  colorScheme: "dark light",
};

/** O esqueleto acessível: link para pular ao conteúdo, cabeçalho, <main> focável e rodapé. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script do <head> muda data-theme e a classe "js" antes do React
    <html lang="en-US" className={`${geist.variable} ${geistMono.variable} ${pixel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* a home (lista de espera) tem cabeçalho e rodapé próprios */}
        <PathSwitch paths={PUBLISHUB_PAGES} match={<WaitlistHeader />} otherwise={<SiteHeader />} />
        <main id="main" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
        <PathSwitch paths={PUBLISHUB_PAGES} match={<WaitlistFooter />} otherwise={<SiteFooter />} />
        <AnalyticsInit />
      </body>
    </html>
  );
}
