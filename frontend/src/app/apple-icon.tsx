import { ImageResponse } from "next/og";
import { logoSvg } from "@/lib/brand/logo-art";

/**
 * O ícone da tela inicial do iPhone (e o que alguns apps procuram quando não aceitam SVG):
 * a logo pixel-art sobre o Midnight. Quadrado cheio: o iOS arredonda os cantos e
 * preencheria a transparência de preto.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(logoSvg(1.5)).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#020002" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
