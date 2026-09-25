import { ImageResponse } from "next/og";
import { isLocale, type AppLocale } from "@/i18n/config";

/**
 * A imagem que aparece quando alguém compartilha um link do Publishub (WhatsApp,
 * Instagram, X, LinkedIn) e que o Google pode usar nos resultados.
 *
 * Uma por idioma: /og?lang=pt-BR. Sem idioma válido, inglês.
 */
const COPY: Record<AppLocale, { title: string; tagline: string; drop: string }> = {
  "pt-BR": { title: "Seu Reel editado por IA", tagline: "Sem o trecho em que as pessoas saem.", drop: "0:04 · as pessoas saíram aqui" },
  en: { title: "Your Reel, edited by AI", tagline: "Without the part where people leave.", drop: "0:04 · people left here" },
  es: { title: "Tu Reel editado con IA", tagline: "Sin la parte en que la gente se va.", drop: "0:04 · la gente se fue aquí" },
};

export function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang");
  const copy = COPY[isLocale(lang) ? lang : "en"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", backgroundColor: "#f7f4ed", padding: "72px 80px", color: "#1e1b16" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#078b72", color: "#fffdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 700 }}>P</div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Publishub</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2 }}>{copy.title}</div>
          <div style={{ marginTop: 18, fontSize: 38, color: "#6b6459" }}>{copy.tagline}</div>
        </div>

        {/* a curva de retenção da marca: cai de repente num segundo marcado */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <svg width="1040" height="120" viewBox="0 0 1040 120">
            <path d="M0 14 L150 22 L190 78 L420 88 L700 96 L1040 104" fill="none" stroke="#1e1b16" strokeWidth="4" />
            <line x1="170" y1="0" x2="170" y2="120" stroke="#078b72" strokeWidth="3" strokeDasharray="8 8" />
          </svg>
          <div style={{ marginTop: 10, fontSize: 24, color: "#078b72" }}>{copy.drop}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
