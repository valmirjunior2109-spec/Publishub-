import { ImageResponse } from "next/og";

/** A prévia do link da lista de espera (X, LinkedIn, Slack): a pergunta em alto contraste, sem gradiente. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Publishub: Your AI writes the code. Who verifies it actually works? Join the early-access waitlist.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", backgroundColor: "#070a14", color: "#edf0f7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <div style={{ display: "flex" }}>Publishub</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#a5baff", border: "2px solid #33406b", borderRadius: 999, padding: "6px 16px" }}>Early access</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          <div style={{ display: "flex", color: "#a2abc4" }}>Your AI writes the code.</div>
          <div style={{ display: "flex" }}>Who verifies it actually works?</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#a2abc4" }}>Verify AI-generated changes and catch regressions before you ship.</div>
      </div>
    ),
    size,
  );
}
