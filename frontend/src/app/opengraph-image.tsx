import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/brand/og";
import { SITE_TAGLINE } from "@/lib/site";

/** A prévia do link da home: a promessa da Publishub sobre o Midnight, com a logo pixel-art e a frase da marca no rodapé. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Publishub: Don't let your next bug be found by a user. Check that your AI-built app still works, before your users do.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgFrame badge="Free check · Daily monitor" footer={SITE_TAGLINE.en}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 70, fontWeight: 700, lineHeight: 1.1 }}>
          <div style={{ display: "flex", color: "#A9AAC2" }}>Don&apos;t let your next bug</div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            be found by a user.
            <div style={{ display: "flex", width: 34, height: 62, marginLeft: 10, marginBottom: 6, backgroundColor: "#6E74F7" }} />
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
