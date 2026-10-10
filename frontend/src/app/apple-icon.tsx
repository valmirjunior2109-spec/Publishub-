import { ImageResponse } from "next/og";
import { LogoArt } from "@/components/LogoArt";

/**
 * O ícone da tela inicial do iPhone (e o que alguns buscadores e apps de
 * mensagem procuram quando não aceitam SVG): o caderno com a caneta sobre o
 * papel creme, como o ícone de referência. Quadrado cheio: o iOS arredonda os
 * cantos e preenche a transparência de preto.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const PAPER = "#F6F0E4";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: PAPER }}>
        {/* o mesmo quadro do ícone (1254), sem o quadrado arredondado: o fundo já é a div */}
        <LogoArt frame="icon" width={180} height={180} halo={PAPER} />
      </div>
    ),
    size,
  );
}
