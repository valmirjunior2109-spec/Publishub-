import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getLocale } from "next-intl/server";
import { defaultTheme, isTheme, THEME_COOKIE } from "@/lib/theme";
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
  const cookieTheme = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(cookieTheme) ? cookieTheme : defaultTheme;
  // "system" não vira atributo: sem ele, o CSS segue o prefers-color-scheme.
  const dataTheme = theme === "system" ? undefined : theme;

  return (
    <html lang={locale} data-theme={dataTheme} className={`${fraunces.variable} ${inter.variable} ${outfit.variable}`}>
      <body>
        {/* Sem props: no v4 o provider herda locale e mensagens do i18n/request.ts */}
        <ReferralCapture />
        <NextIntlClientProvider>
          <ThemeProvider initial={theme}>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
