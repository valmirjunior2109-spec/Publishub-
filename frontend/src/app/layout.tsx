import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, Outfit } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ClaimGuestWork } from "@/components/ClaimGuestWork";
import { PageViews } from "@/components/PageViews";
import { ReferralCapture } from "@/components/ReferralCapture";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Só para o logotipo: geométrica e arredondada, no espírito do "P" da marca.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-brand",
  display: "swap",
});

/**
 * O que vale para o site inteiro. Cada página pública troca título, descrição,
 * canonical e hreflang pelos dela (lib/seo.ts); as de conta saem do índice.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Seo.home");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description: t("description"),
    applicationName: SITE_NAME,
    openGraph: { siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image" },
    // o código que o Google Search Console pede para provar que o domínio é seu
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable} ${outfit.variable}`}>
      <head>
        {/* antes de qualquer pixel: se a pessoa já escolheu um tema, ele já vale */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {/* Sem props: no v4 o provider herda locale e mensagens do i18n/request.ts */}
        <PageViews />
        <ReferralCapture />
        {/* o teste feito sem cadastro vira parte da conta no instante em que ela existe */}
        <ClaimGuestWork />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
