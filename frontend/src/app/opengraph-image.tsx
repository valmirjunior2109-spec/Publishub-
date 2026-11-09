import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/brand/og";

/** A prévia do link da home (lista de espera): a pergunta em creme sobre o Midnight, com a logo pixel-art. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Publishub: Your AI writes the code. Who verifies it actually works? Join the early-access waitlist.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgFrame badge="Early access" footer="Verify AI-generated code changes and catch regressions before you ship.">
        <div style={{ display: "flex", flexDirection: "column", fontSize: 70, fontWeight: 700, lineHeight: 1.1 }}>
          <div style={{ display: "flex", color: "#AAA1B5" }}>Your AI writes the code.</div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            Who verifies it actually works?
            <div style={{ display: "flex", width: 34, height: 62, marginLeft: 10, marginBottom: 6, backgroundColor: "#9147FF" }} />
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
