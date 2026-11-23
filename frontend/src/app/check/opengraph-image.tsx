import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/brand/og";

/** A prévia do link do teste grátis. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Publishub free AI app checker: test your app in a real browser.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgFrame badge="Free tool" footer="Paste your URL. Find JavaScript crashes, failed requests and broken pages in a real browser.">
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          <div style={{ display: "flex", color: "#A9AAC2" }}>Is your AI-built app</div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            actually working?
            <div style={{ display: "flex", width: 34, height: 62, marginLeft: 10, marginBottom: 6, backgroundColor: "#6E74F7" }} />
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
