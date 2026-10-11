import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { FOUNDER } from "./src/content/founder";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // a foto do fundador é conferida no build: no servidor da Vercel a pasta public não está no disco
  env: { FOUNDER_PHOTO: existsSync(join(process.cwd(), "public", FOUNDER.photo)) ? FOUNDER.photo : "" },
  poweredByHeader: false,
  devIndicators: false, // o botão "N" do modo dev cobria o avatar do painel
  // Abas abertas durante um deploy: com o id do deploy nos assets, o Next
  // percebe a troca de versão e recarrega a página em vez de misturar JS velho com CSS novo.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
};

export default withNextIntl(nextConfig);
