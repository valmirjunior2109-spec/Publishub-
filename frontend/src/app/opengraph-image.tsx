import { ImageResponse } from "next/og";

/** A prévia do link (WhatsApp, X, LinkedIn): a pergunta do site em alto contraste. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Publishub: free accessibility scan for Shopify stores";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", backgroundColor: "#ffffff", color: "#0b1324" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#1747a6" }}>Publishub · Fix it before you publish.</div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>Is your Shopify store an ADA lawsuit target?</div>
        <div style={{ display: "flex", fontSize: 32, color: "#475467" }}>Free WCAG 2.2 AA scan in about a minute. Not legal advice.</div>
      </div>
    ),
    size,
  );
}
