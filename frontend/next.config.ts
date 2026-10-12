import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { FOUNDER } from "./src/content/founder";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Os endereços eram em português (/planos, /nova-analise...). Os antigos continuam
// valendo: links salvos, o Google, o retorno do Stripe (/obrigado?session_id=) e o
// e-mail de senha do Supabase (/redefinir-senha) chegam na página nova. A query passa junto.
const RENAMED: Record<string, string> = {
  "/planos": "/pricing",
  "/experimentar": "/try",
  "/guias": "/guides",
  "/nova-analise": "/new-analysis",
  "/conta": "/account",
  "/memoria": "/memory",
  "/obrigado": "/thank-you",
  "/bem-vindo": "/welcome",
  "/redefinir-senha": "/reset-password",
  "/termos": "/terms",
  "/privacidade": "/privacy",
};
const LOCALES = "pt|es|fr|de|it|hi|id|tr|ja|ko";

async function redirects() {
  const rules = Object.entries(RENAMED).flatMap(([from, to]) => [
    { source: from, destination: to, permanent: true },
    { source: `${from}/:path+`, destination: `${to}/:path+`, permanent: true },
    { source: `/:locale(${LOCALES})${from}`, destination: `/:locale${to}`, permanent: true },
    { source: `/:locale(${LOCALES})${from}/:path+`, destination: `/:locale${to}/:path+`, permanent: true },
  ]);
  // a rota antiga da análise só existia para levar ao resultado
  rules.push({ source: "/analise/:id", destination: "/results/:id", permanent: true });
  return rules;
}

const nextConfig: NextConfig = {
  // a foto do fundador é conferida no build: no servidor da Vercel a pasta public não está no disco
  env: { FOUNDER_PHOTO: existsSync(join(process.cwd(), "public", FOUNDER.photo)) ? FOUNDER.photo : "" },
  poweredByHeader: false,
  devIndicators: false, // o botão "N" do modo dev cobria o avatar do painel
  // Abas abertas durante um deploy: com o id do deploy nos assets, o Next
  // percebe a troca de versão e recarrega a página em vez de misturar JS velho com CSS novo.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  redirects,
};

export default withNextIntl(nextConfig);
