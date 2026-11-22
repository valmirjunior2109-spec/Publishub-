import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import { AnalyticsInit } from "@/components/AnalyticsInit";
import { WaitlistFooter, WaitlistHeader } from "@/components/waitlist/WaitlistChrome";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { WAITLIST_TAGLINE } from "@/lib/waitlist";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// a fonte de pixel da marca: rótulos, selos e o nome, nunca texto corrido
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${WAITLIST_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", title: `${SITE_NAME}: ${WAITLIST_TAGLINE}`, description: SITE_DESCRIPTION, url: SITE_URL },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${WAITLIST_TAGLINE}`, description: SITE_DESCRIPTION },
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
        <WaitlistHeader />
        <main id="main" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
        <WaitlistFooter />
        <AnalyticsInit />
      </body>
    </html>
  );
}
