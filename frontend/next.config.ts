import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false, // o botão "N" do modo dev cobria o avatar do painel
  // Abas abertas durante um deploy: com o id do deploy nos assets, o Next
  // percebe a troca de versão e recarrega a página em vez de misturar JS velho com CSS novo.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
};

export default withNextIntl(nextConfig);
