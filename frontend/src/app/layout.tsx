import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Caveat, Fraunces, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { AnalyticsIdentity } from "@/components/AnalyticsIdentity";
import { ClaimGuestWork } from "@/components/ClaimGuestWork";
import { PageViews } from "@/components/PageViews";
import { WarmBackend } from "@/components/WarmBackend";
import { ReferralCapture } from "@/components/ReferralCapture";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

/* `subsets` é só o que vai pré-carregado: o latin-ext (o ş e o ğ do turco, por exemplo) continua no CSS e
   chega sob demanda, pelo unicode-range.
   Tirar o pré-carregamento de todas foi medido e não entrou: com latência de 150 ms por pedido o LCP caía em
   todas as páginas, mas com o perfil 4G lento do Lighthouse (562 ms por pedido) a landing e os planos ficavam
   ~1,2 s mais lentos. Sem um resultado que valha nos dois, fica como estava. */

// Texto e títulos: uma grotesca neutra e precisa.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Os títulos: uma serifa editorial, a mesma dos posts (social/). O itálico "WONK" é o da ênfase caramelo.
// A reserva automática do next/font é medida no tamanho óptico padrão; os títulos usam o de display (opsz 144),
// bem mais estreito, e ela ficava ~21% mais larga: o título quebrava em mais linhas e tudo pulava quando a
// fonte chegava. As reservas certas estão em globals.css ("Fraunces Display Fallback").
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Fraunces Display Fallback", "Fraunces Display Fallback Noto"],
});

// As anotações à mão do editor, em azul de caneta: só em detalhes, nunca em texto que precise ser lido de corrido.
// Enfeite, não conteúdo: chega quando a página pede, sem disputar a banda da primeira tela.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
  preload: false,
});

// Tempos do vídeo, rótulos e números: a mono da mesma família.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const NOSCRIPT_STYLE = "<style>.reveal{opacity:1;transform:none}.curve-draw path[data-line]{stroke-dashoffset:0}.curve-draw [data-marker],.curve-draw [data-guide]{opacity:1}</style>";

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
    <html lang={locale} className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} ${caveat.variable}`}>
      <head>
        {/* antes de qualquer pixel: se a pessoa já escolheu um tema, ele já vale */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* sem JavaScript o IntersectionObserver nunca roda: o que surge ao rolar já nasce visível */}
        <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_STYLE }} />
      </head>
      <body>
        {/* Sem props: no v4 o provider herda locale e mensagens do i18n/request.ts */}
        <PageViews />
        <WarmBackend />
        <AnalyticsIdentity />
        <ReferralCapture />
        {/* o teste feito sem cadastro vira parte da conta no instante em que ela existe */}
        <ClaimGuestWork />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
