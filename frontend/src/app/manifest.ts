import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/** Nome, cores e ícones de quando alguém salva o site na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "AI editing copilot for Reels, TikTok and Shorts.",
    start_url: "/",
    display: "browser",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
