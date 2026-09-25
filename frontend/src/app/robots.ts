import type { MetadataRoute } from "next";
import { LOCALE_PREFIX } from "@/i18n/paths";
import { SITE_URL } from "@/lib/seo";

/** As áreas de conta e de app: sem nada para quem pesquisa, e atrás de login de qualquer jeito. */
const PRIVATE = ["/dashboard", "/conta", "/results/", "/analise/", "/nova-analise", "/bem-vindo", "/obrigado", "/success", "/admin", "/design-system", "/notion/", "/login", "/signup"];

export default function robots(): MetadataRoute.Robots {
  const prefixes = Object.values(LOCALE_PREFIX);
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...prefixes.flatMap((prefix) => PRIVATE.map((path) => prefix + path))],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
