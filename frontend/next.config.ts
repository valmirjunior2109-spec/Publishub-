import type { NextConfig } from "next";

/*
 * O site é a Publishub de verificação de aplicações feitas com IA. Os endereços dos produtos
 * anteriores levam para a home, para links salvos e o Google não caírem num 404:
 * - a análise de vídeo (em 11 idiomas; o código antigo está em legacy/, fora do build);
 * - as landings do scanner de acessibilidade para lojas Shopify, descontinuado.
 * Os relatórios do scanner (/scan/...) e a página de sucesso da reserva dele (/reserve/success)
 * NÃO redirecionam: não existe substituto, então respondem 404.
 */
const LOCALES = "pt|es|fr|de|it|hi|id|tr|ja|ko|en";
const OLD_ROUTES = [
  "/try",
  "/new-analysis",
  "/results/:path*",
  "/dashboard",
  "/memory",
  "/account",
  "/tools/:path*",
  "/tools",
  "/s/:path*",
  "/partners",
  "/appsumo",
  "/welcome",
  "/thank-you",
  "/success",
  "/notion/:path*",
  "/signup",
  "/reset-password",
  "/design-system",
  // as landings do scanner de acessibilidade para lojas Shopify (descontinuado)
  "/scanner",
  "/shopify-ada-compliance-checker",
  "/accessibility-statement",
  // os endereços em português de antes da troca para o inglês
  "/planos",
  "/experimentar",
  "/guias",
  "/nova-analise",
  "/conta",
  "/memoria",
  "/obrigado",
  "/bem-vindo",
  "/redefinir-senha",
  "/termos",
  "/privacidade",
  "/analise/:path*",
];

async function redirects() {
  return [
    // /pt/terms → /terms: o site agora é só em inglês
    { source: `/:locale(${LOCALES})`, destination: "/", permanent: true },
    { source: `/:locale(${LOCALES})/:path*`, destination: "/:path*", permanent: true },
    { source: "/pricing", destination: "/#pricing", permanent: true },
    // a lista de espera morou em /verify antes de virar a home (temporário: o endereço pode voltar a ser usado)
    { source: "/verify", destination: "/", permanent: false },
    { source: "/termos", destination: "/terms", permanent: true },
    { source: "/privacidade", destination: "/privacy", permanent: true },
    ...OLD_ROUTES.filter((source) => source !== "/termos" && source !== "/privacidade").map((source) => ({ source, destination: "/", permanent: true })),
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Abas abertas durante um deploy: com o id do deploy nos assets, o Next percebe a troca e recarrega.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  // O Chromium do teste grátis (binários comprimidos) precisa ir junto na função que roda o teste.
  outputFileTracingIncludes: {
    "/api/check": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  redirects,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
