import { Fraunces, Inter } from "next/font/google";
import Header from "@/components/Header";
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

export const metadata = {
  title: "Publishub — copiloto de edição para criadores",
  description:
    "Envie o vídeo antes de publicar. O Publishub aponta onde cortar, o que ajustar no hook, nas legendas e no ritmo — com o momento exato de cada mudança.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
