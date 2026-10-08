import { ImageResponse } from "next/og";
import { isLocale, type AppLocale } from "@/i18n/config";
import { findGuide, type Guide } from "@/lib/guides";

/**
 * A imagem que aparece quando alguém compartilha um link do Publishub (WhatsApp,
 * Instagram, X, LinkedIn) e que o Google pode usar nos resultados.
 *
 * A mesma cara da landing: fundo quase preto, a promessa do hero em Geist e, ao
 * lado, a tela de revisão do produto (as linhas do vídeo, o que sai, o que fica
 * e a decisão do lado de quem fez o vídeo). É o mesmo exemplo da landing
 * (fixture), e a imagem diz que é exemplo.
 *
 * Uma por idioma: /og?lang=pt-BR. Sem idioma válido, inglês.
 *
 * Os guias têm a sua: /og?guide=<slug>, com o título do guia. É o que aparece
 * quando alguém compartilha um artigo, e o que o Google pode mostrar ao lado dele.
 */
interface Line {
  time: string;
  text: string;
  mark: "cut" | "keep";
  note: string;
}

interface Copy {
  kicker: string;
  title: string;
  tagline: string;
  example: string;
  window: string;
  lines: Line[];
  decide: string;
  accepted: string;
  skipped: string;
}

const COPY: Record<AppLocale, Copy> = {
  en: {
    kicker: "AI video editing copilot",
    title: "Find where your Reel loses viewers and what to change.",
    tagline: "AI that edits with you, not for you.",
    example: "Example",
    window: "Your Reel's analysis",
    lines: [
      { time: "0:00", text: "Hey guys, how's it going?", mark: "cut", note: "hook takes too long" },
      { time: "0:03", text: "So, before anything else…", mark: "cut", note: "0:04 — attention drops here" },
      { time: "0:06", text: "30 days without coffee.", mark: "keep", note: "the payoff. keep it" },
    ],
    decide: "You decide",
    accepted: "3 accepted",
    skipped: "1 skipped",
  },
  "pt-BR": {
    kicker: "Copiloto de edição de vídeo com IA",
    title: "Descubra onde seu Reel perde as pessoas e o que mudar.",
    tagline: "IA que edita com você, não por você.",
    example: "Exemplo",
    window: "Análise do seu Reel",
    lines: [
      { time: "0:00", text: "Oi, gente, tudo bem?", mark: "cut", note: "o gancho demora demais" },
      { time: "0:03", text: "Então, antes de tudo…", mark: "cut", note: "0:04 — a atenção cai aqui" },
      { time: "0:06", text: "30 dias sem café.", mark: "keep", note: "o ponto alto. mantém" },
    ],
    decide: "Você decide",
    accepted: "3 aceitas",
    skipped: "1 ignorada",
  },
  es: {
    kicker: "Copiloto de edición de video con IA",
    title: "Descubre dónde tu Reel pierde a la gente y qué cambiar.",
    tagline: "IA que edita contigo, no por ti.",
    example: "Ejemplo",
    window: "Análisis de tu Reel",
    lines: [
      { time: "0:00", text: "Hola, ¿cómo están?", mark: "cut", note: "el gancho tarda demasiado" },
      { time: "0:03", text: "Entonces, antes que nada…", mark: "cut", note: "0:04 — aquí cae la atención" },
      { time: "0:06", text: "30 días sin café.", mark: "keep", note: "el momento clave. mantenlo" },
    ],
    decide: "Tú decides",
    accepted: "3 aceptadas",
    skipped: "1 descartada",
  },
};

/* As cores do tema escuro do site (globals.css): quase preto, texto claro, o rosa da marca. */
const C = {
  paper: "#0a0a0b",
  raised: "#131316",
  surface: "#18181b",
  ink: "#f5f5f7",
  muted: "#a1a1aa",
  line: "#26262b",
  accent: "#f06aa4",
  accentSoft: "#2b1220",
  confirmed: "#6fcf97",
};

/**
 * Uma fonte do Google, só com os caracteres desta imagem. Sem User-Agent o Google
 * devolve TTF, que é o que o gerador lê. Se a busca falhar, a imagem sai na fonte
 * padrão: fica menos bonita, mas sai.
 */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src) return null;
    const font = await fetch(src[1]);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Geist (semibold e regular) e Geist Mono, só com os caracteres que a imagem usa. */
async function loadFonts(text: string) {
  const [semibold, regular, mono] = await Promise.all([googleFont("Geist", 600, text), googleFont("Geist", 400, text), googleFont("Geist+Mono", 500, text)]);
  const fonts = [
    ...(semibold ? [{ name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "Geist", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const }] : []),
  ];
  return { fonts: fonts.length ? fonts : undefined, sans: semibold || regular ? "Geist" : undefined, mono: mono ? "Geist Mono" : undefined };
}

/** Todos os textos de um idioma, para baixar só os caracteres que a imagem usa. */
function allText(copy: Copy): string {
  const lines = copy.lines.flatMap((line) => [line.time, line.text, line.note]);
  return ["Publishub", "getpublishub.com", "→ ·", copy.kicker.toUpperCase(), copy.example, copy.title, copy.tagline, copy.window, copy.decide, copy.accepted, copy.skipped, ...lines].join(" ");
}

/** O caderno do editor, o mesmo desenho de components/Logo.tsx, nas cores do tema escuro. */
function Mark({ height }: { height: number }) {
  return (
    <svg width={(height * 104) / 120} height={height} viewBox="0 0 104 120">
      <rect x="8" y="8" width="66" height="104" rx="11" fill={C.ink} />
      <rect x="14" y="93" width="54" height="9" rx="4.5" fill={C.paper} />
      <rect x="54" y="8" width="8" height="104" fill={C.muted} />
      <g transform="rotate(20 75 58)" fill={C.accent}>
        <rect x="70" y="8" width="10" height="80" rx="5" />
        <rect x="81" y="12" width="3.4" height="26" rx="1.7" />
        <path d="M70.5 86 L79.5 86 L75 99 Z" />
      </g>
    </svg>
  );
}

function Brand({ sans }: { sans?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Mark height={40} />
      <div style={{ display: "flex", fontFamily: sans, fontSize: 30, fontWeight: 600, letterSpacing: -1, color: C.ink }}>Publishub</div>
    </div>
  );
}

/** "Guia · 6 min de leitura", no idioma do guia. */
const GUIDE_LABEL: Record<AppLocale, (minutes: number) => string> = {
  en: (minutes) => `Guide · ${minutes} min read`,
  "pt-BR": (minutes) => `Guia · ${minutes} min de leitura`,
  es: (minutes) => `Guía · ${minutes} min de lectura`,
};

const IMAGE_OPTIONS = { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } };

/** A prévia de um guia: a marca, o rótulo, o título grande e a frase da marca. */
async function guideImage(guide: Guide) {
  const copy = COPY[guide.locale];
  const label = GUIDE_LABEL[guide.locale](guide.minutes).toUpperCase();
  const { fonts, sans, mono } = await loadFonts(["Publishub", "getpublishub.com", label, guide.title, copy.tagline].join(" "));
  // títulos longos em letra menor, para caberem em três linhas
  const titleSize = guide.title.length > 56 ? 60 : 72;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", backgroundColor: C.paper, color: C.ink, fontFamily: sans }}>
        <Brand sans={sans} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: mono, fontSize: 18, letterSpacing: 1.4, color: C.accent }}>{label}</div>
          <div style={{ display: "flex", marginTop: 24, maxWidth: 1040, fontSize: titleSize, fontWeight: 600, lineHeight: 1.06, letterSpacing: -2.8 }}>{guide.title}</div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 24 }}>
          <div style={{ display: "flex", fontSize: 24, color: C.muted }}>{copy.tagline}</div>
          <div style={{ display: "flex", fontFamily: mono, fontSize: 19, color: C.muted }}>getpublishub.com</div>
        </div>
      </div>
    ),
    { ...IMAGE_OPTIONS, fonts },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const guide = findGuide(params.get("guide") ?? "");
  if (guide) return guideImage(guide);

  const lang = params.get("lang");
  const copy = COPY[isLocale(lang) ? lang : "en"];
  const { fonts, sans, mono } = await loadFonts(allText(copy));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48, padding: "60px 64px", backgroundColor: C.paper, color: C.ink, fontFamily: sans }}>
        {/* esquerda: a marca, o que o produto é e a promessa do hero */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 580, height: "100%" }}>
          <Brand sans={sans} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: mono, fontSize: 16, letterSpacing: 1.3, color: C.accent }}>
              <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, backgroundColor: C.accent }} />
              {copy.kicker.toUpperCase()}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 58, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2.6 }}>{copy.title}</div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 24, color: C.muted }}>{copy.tagline}</div>
          </div>

          <div style={{ display: "flex", fontFamily: mono, fontSize: 19, color: C.muted }}>getpublishub.com</div>
        </div>

        {/* direita: a tela de revisão, com o que sai, o que fica e a decisão no fim */}
        <div style={{ display: "flex", flexDirection: "column", width: 470, borderRadius: 24, border: `1px solid ${C.line}`, backgroundColor: C.raised, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, padding: "0 20px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 999, backgroundColor: C.line }} />
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 999, backgroundColor: C.line }} />
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 999, backgroundColor: C.line }} />
            </div>
            <div style={{ display: "flex", fontFamily: mono, fontSize: 14, color: C.muted }}>{copy.window}</div>
            <div style={{ display: "flex", fontSize: 13, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 999, padding: "2px 10px" }}>{copy.example}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", padding: "10px 24px 0" }}>
            {copy.lines.map((line, index) => (
              <div key={line.time} style={{ display: "flex", flexDirection: "column", padding: "14px 0", borderBottom: index < copy.lines.length - 1 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  <div style={{ display: "flex", width: 40, fontFamily: mono, fontSize: 14, color: index === 1 ? C.accent : C.muted }}>{line.time}</div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 20,
                      color: line.mark === "cut" ? C.muted : C.ink,
                      textDecoration: line.mark === "cut" ? "line-through" : "none",
                      backgroundColor: line.mark === "keep" ? C.accentSoft : "transparent",
                      borderRadius: 4,
                      padding: line.mark === "keep" ? "0 5px" : 0,
                    }}
                  >
                    {line.text}
                  </div>
                </div>
                <div style={{ display: "flex", marginTop: 6, marginLeft: 54, fontSize: 15, color: line.mark === "keep" ? C.confirmed : C.accent }}>{line.note}</div>
              </div>
            ))}
          </div>

          {/* a decisão é sempre de quem fez o vídeo */}
          <div style={{ display: "flex", flexDirection: "column", margin: "16px 24px 24px", borderRadius: 14, border: `1px solid ${C.line}`, backgroundColor: C.surface, padding: "16px 18px" }}>
            <div style={{ display: "flex", fontFamily: mono, fontSize: 13, letterSpacing: 1.2, color: C.muted }}>{copy.decide.toUpperCase()}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, fontSize: 16, fontWeight: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, backgroundColor: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 999, padding: "4px 12px" }}>
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M2 7.5 L5.5 11 L12 3" fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {copy.accepted}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 12px" }}>{copy.skipped}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...IMAGE_OPTIONS, fonts },
  );
}
