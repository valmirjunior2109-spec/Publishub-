import type { ReactNode } from "react";
import { logoSvg } from "./logo-art";

/**
 * O molde das imagens de prévia de link (X, LinkedIn, WhatsApp): o Midnight, a logo pixel-art,
 * uma grade discreta e um rodapé com faixa roxa. Cada página só passa o selo e o texto.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const LOGO_SRC = `data:image/svg+xml;base64,${Buffer.from(logoSvg(0)).toString("base64")}`;

export function OgFrame({ badge, children, footer }: { badge: string; children: ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        backgroundColor: "#0D0B12",
        backgroundImage: "linear-gradient(rgba(242,215,160,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(242,215,160,0.05) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        color: "#F2D7A0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* a logo é o "P" do nome: [P]ublishub, com a base do P na linha de base do texto */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} width={92} height={92} alt="" style={{ marginBottom: -5 }} />
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1, marginBottom: 2 }}>ublishub</div>
        </div>
        <div style={{ display: "flex", marginLeft: 8, fontSize: 22, fontWeight: 600, color: "#C18AFF", border: "2px solid #9147FF", padding: "6px 14px" }}>{badge}</div>
      </div>
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#AAA1B5" }}>
        <div style={{ display: "flex", width: 18, height: 18, backgroundColor: "#9147FF", boxShadow: "4px 4px 0 0 #4A2386" }} />
        {footer}
      </div>
    </div>
  );
}
