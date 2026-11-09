import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PAGES = ["/", "/scanner", "/shopify-ada-compliance-checker", "/scan/sample", "/accessibility-statement", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, changeFrequency: "weekly", priority: path === "/" ? 1 : 0.6 }));
}
