import type { NextConfig } from "next";

/*
 * O site virou o scanner de acessibilidade para lojas Shopify. Os endereços do produto
 * anterior (análise de vídeo, em 11 idiomas) levam para as páginas novas, para links
 * salvos e o Google não caírem num 404. O código antigo está em legacy/, fora do build.
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
  "/guides/:path*",
  "/guides",
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
  "/llms.txt",
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
  // O Chromium do scanner (binários comprimidos) precisa ir junto nas funções que rodam o scan.
  outputFileTracingIncludes: {
    "/api/scan": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/scan/[id]/run": ["./node_modules/@sparticuz/chromium/bin/**/*"],
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
