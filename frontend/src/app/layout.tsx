import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, Outfit } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ClaimGuestWork } from "@/components/ClaimGuestWork";
import { PageViews } from "@/components/PageViews";
import { ReferralCapture } from "@/components/ReferralCapture";
import { getLocale } from "next-intl/server";
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

export const metadata: Metadata = {
  title: "Publishub",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable} ${outfit.variable}`}>
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
