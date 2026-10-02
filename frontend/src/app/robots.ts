import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Só a API fica de fora. As áreas de conta e de app (painel, análises, login…)
 * já saem do índice pelo noindex do layout delas (PRIVATE_METADATA), e o Google
 * só obedece o noindex de uma página que ele pode abrir: bloqueadas aqui, as que
 * têm link no site inteiro (/login, /signup) apareciam no Google como "indexada,
 * mas bloqueada pelo robots.txt", sem título nem descrição.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
