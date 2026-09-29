import { ImageResponse } from "next/og";
import { isLocale, type AppLocale } from "@/i18n/config";

/**
 * A imagem que aparece quando alguém compartilha um link do Publishub (WhatsApp,
 * Instagram, X, LinkedIn) e que o Google pode usar nos resultados.
 *
 * Mostra o que a pessoa recebe de verdade, não uma promessa genérica: o segundo
 * da queda, a frase dita nele e o que mudar primeiro. É o mesmo exemplo da
 * landing (fixture), e a imagem diz que é exemplo.
 *
 * Uma por idioma: /og?lang=pt-BR. Sem idioma válido, inglês.
 */
interface Copy {
  title: string;
  lead: string;
  window: string;
  example: string;
  left: string;
  said: string;
  quote: string;
  fix: string;
  fixText: string;
}

const COPY: Record<AppLocale, Copy> = {
  "pt-BR": {
    title: "Descubra onde seu Reel perde gente e o que mudar",
    lead: "O segundo da queda, a frase que você dizia e cortes que você decide aceitar.",
    window: "Análise do seu Reel",
    example: "Exemplo",
    left: "saíram neste segundo",
    said: "O que você dizia",
    quote: "“Então, antes de tudo, deixa eu dar um contexto rápido…”",
    fix: "Mude primeiro",
    fixText: "Corte 0:00 → 0:04 e abra com o resultado",
  },
  en: {
    title: "Find where your Reel loses viewers and what to change",
    lead: "The second of the drop, the line you were saying, and cuts you choose to accept.",
    window: "Your Reel's analysis",
    example: "Example",
    left: "left at this second",
    said: "What you were saying",
    quote: "“So, before anything else, let me give you some quick context…”",
    fix: "Fix first",
    fixText: "Cut 0:00 → 0:04 and open with the result",
  },
  es: {
    title: "Descubre dónde tu Reel pierde gente y qué cambiar",
    lead: "El segundo de la caída, la frase que decías y cortes que tú decides aceptar.",
    window: "Análisis de tu Reel",
    example: "Ejemplo",
    left: "se fueron aquí",
    said: "Lo que decías",
    quote: "“Entonces, antes que nada, déjame darte un poco de contexto…”",
    fix: "Cambia primero",
    fixText: "Corta 0:00 → 0:04 y abre con el resultado",
  },
};

/* As cores do site no tema escuro (globals.css): a prévia chama atenção no WhatsApp e continua sendo a marca. */
const C = { paper: "#0b0e0c", raised: "#131815", ink: "#eef3ef", muted: "#9aa49c", line: "#242b26", accent: "#23d5a3", soft: "#0f2a22" };

/**
 * A fonte dos títulos do site, só com os caracteres desta imagem. Sem User-Agent o
 * Google devolve TTF, que é o que o gerador lê. Se a busca falhar, a imagem sai
 * na fonte padrão: fica menos bonita, mas sai.
 */
async function jakarta(weight: 600 | 800, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src) return null;
    const font = await fetch(src[1]);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang");
  const copy = COPY[isLocale(lang) ? lang : "en"];
  const everything = ["Publishub", "getpublishub.com", "0:04", "−32%", ...Object.values(copy)].join(" ");
  const [bold, semibold] = await Promise.all([jakarta(800, everything), jakarta(600, everything)]);
  const fonts = [
    ...(bold ? [{ name: "Jakarta", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ...(semibold ? [{ name: "Jakarta", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
  ];

  const label = { fontSize: 17, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" as const, color: C.muted };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 56,
          padding: "64px 72px",
          backgroundColor: C.paper,
          backgroundImage: "radial-gradient(circle at 78% 20%, rgba(35,213,163,0.16), rgba(11,14,12,0) 55%)",
          color: C.ink,
          fontFamily: fonts.length ? "Jakarta" : undefined,
        }}
      >
        {/* esquerda: a marca e a promessa, sem exagero */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.accent, color: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800 }}>P</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>Publishub</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.8 }}>{copy.title}</div>
            <div style={{ marginTop: 22, fontSize: 25, lineHeight: 1.4, color: C.muted }}>{copy.lead}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.accent }}>getpublishub.com</div>
        </div>

        {/* direita: o que a análise devolve de verdade, rotulado como exemplo */}
        <div style={{ display: "flex", flexDirection: "column", width: 470, borderRadius: 26, border: `2px solid ${C.line}`, backgroundColor: C.raised, padding: 30 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.muted }}>{copy.window}</div>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted, border: `1.5px solid ${C.line}`, borderRadius: 999, padding: "4px 12px" }}>{copy.example}</div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
            <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: C.accent }}>0:04</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 8 }}>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 800, backgroundColor: C.soft, color: C.accent, borderRadius: 999, padding: "4px 14px" }}>−32%</div>
              <div style={{ marginTop: 6, fontSize: 16, color: C.muted }}>{copy.left}</div>
            </div>
          </div>

          {/* a curva: estável, a queda no segundo marcado, e o resto do vídeo */}
          <svg width="410" height="70" viewBox="0 0 410 70" style={{ marginTop: 14 }}>
            <path d="M0 8 L70 12 L92 46 L200 52 L300 57 L410 62" fill="none" stroke={C.ink} strokeWidth="3" />
            <line x1="82" y1="0" x2="82" y2="70" stroke={C.accent} strokeWidth="2.5" strokeDasharray="6 6" />
            <circle cx="82" cy="30" r="6" fill={C.accent} />
          </svg>

          <div style={{ ...label, marginTop: 20 }}>{copy.said}</div>
          <div style={{ display: "flex", marginTop: 8, paddingLeft: 14, borderLeft: `4px solid ${C.accent}`, fontSize: 21, lineHeight: 1.35 }}>{copy.quote}</div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 20, paddingTop: 18, borderTop: `2px solid ${C.line}` }}>
            <div style={{ ...label, color: C.accent }}>{copy.fix}</div>
            <div style={{ marginTop: 6, fontSize: 21, fontWeight: 600, lineHeight: 1.3 }}>{copy.fixText}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
