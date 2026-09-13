import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
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

export const metadata: Metadata = {
  title: "Publishub",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {/* Sem props: no v4 o provider herda locale e mensagens do i18n/request.ts */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
