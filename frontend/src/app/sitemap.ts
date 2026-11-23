import type { MetadataRoute } from "next";
import { PLATFORMS } from "@/lib/platforms";
import { SITE_URL } from "@/lib/site";

const PAGES = ["/", "/check", ...PLATFORMS.map((p) => `/app-checker/${p.slug}`), "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, changeFrequency: "weekly", priority: path === "/" ? 1 : path === "/check" ? 0.9 : path.startsWith("/app-checker/") ? 0.8 : 0.3 }));
}
