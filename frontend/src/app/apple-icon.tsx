import { ImageResponse } from "next/og";

/**
 * O ícone da tela inicial do iPhone (e o que alguns buscadores e apps de
 * mensagem procuram quando não aceitam SVG): o caderno do icon.svg, num PNG
 * com fundo de papel, porque o iOS preenche a transparência de preto.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f6f0e4" }}>
        <svg width="112" height="112" viewBox="-8 0 120 120">
          <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A" />
          <rect x="14" y="93" width="54" height="9" rx="4.5" fill="#FBF3E6" />
          <rect x="54" y="8" width="8" height="104" fill="#1E1B18" />
          <g transform="rotate(20 75 58)" fill="#1F47A6">
            <rect x="70" y="8" width="10" height="80" rx="5" />
            <rect x="78" y="12" width="5" height="4" rx="1" />
            <rect x="81" y="12" width="3.4" height="26" rx="1.7" />
            <path d="M70.5 86 L79.5 86 L75 99 Z" />
            <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="#FBF3E6" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
