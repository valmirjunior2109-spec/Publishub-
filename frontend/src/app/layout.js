import Header from "@/components/Header";
import "./globals.css";

export const metadata = {
  title: "Publishub — Copiloto de edição com IA",
  description: "Envie seu vídeo, o Publishub analisa e você recebe recomendações práticas para melhorar a edição.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
