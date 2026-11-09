import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/brand/og";

/** A prévia do link do scanner de lojas: a pergunta do scanner com a identidade da marca. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Publishub: free accessibility scan for Shopify stores";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgFrame badge="Shopify scanner" footer="Free WCAG 2.2 AA scan in about a minute. Not legal advice.">
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Is your Shopify store an ADA lawsuit target?</div>
      </OgFrame>
    ),
    size,
  );
}
