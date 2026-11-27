import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { PLATFORMS } from "@/lib/platforms";
import { SITE_URL } from "@/lib/site";

const PAGES = ["/", "/pt", "/check", "/pt/check", ...PLATFORMS.map((p) => `/app-checker/${p.slug}`), "/guides", ...GUIDES.map((g) => `/guides/${g.slug}`), "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, changeFrequency: "weekly", priority: path === "/" || path === "/pt" ? 1 : path === "/check" || path === "/pt/check" ? 0.9 : path.startsWith("/app-checker/") || path.startsWith("/guides") ? 0.8 : 0.3 }));
}
