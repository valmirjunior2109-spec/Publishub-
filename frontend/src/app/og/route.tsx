import { ImageResponse } from "next/og";
import { isLocale, type AppLocale } from "@/i18n/config";
import { findGuide, type Guide } from "@/lib/guides";

/**
 * A imagem que aparece quando alguém compartilha um link do publishub (WhatsApp,
 * Instagram, X, LinkedIn) e que o Google pode usar nos resultados.
 *
 * A mesma cara do hero da landing: o fundo escuro do caderno, a promessa com a
 * palavra circulada e, ao lado, o copiloto revisando o vídeo como um editor faria
 * (as notas à mão na margem e a decisão do lado de quem fez o vídeo). É o mesmo
 * exemplo da landing (fixture), e a imagem diz que é exemplo.
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
  /** o título em três linhas; a terceira tem a palavra circulada no meio */
  title: [string, string];
  circledBefore: string;
  circled: string;
  circledAfter: string;
  tagline: string;
  example: string;
  lines: Line[];
  decide: string;
  accepted: string;
  skipped: string;
}

const COPY: Record<AppLocale, Copy> = {
  en: {
    kicker: "AI video editing copilot · for creators",
    title: ["Your Reel has", "one weak second."],
    circledBefore: "We ",
    circled: "circle",
    circledAfter: " it.",
    tagline: "AI that edits with you, not for you.",
    example: "Example",
    lines: [
      { time: "0:00", text: "Hey guys, how's it going?", mark: "cut", note: "hook takes too long" },
      { time: "0:03", text: "So, before anything else…", mark: "cut", note: "0:04 — attention drops here" },
      { time: "0:06", text: "30 days without coffee.", mark: "keep", note: "the payoff. keep this!" },
    ],
    decide: "you decide",
    accepted: "3 accepted",
    skipped: "1 skipped",
  },
  "pt-BR": {
    kicker: "Copiloto de edição de vídeo com IA · para criadores",
    title: ["Seu Reel tem", "um segundo fraco."],
    circledBefore: "A gente ",
    circled: "circula",
    circledAfter: ".",
    tagline: "IA que edita com você, não por você.",
    example: "Exemplo",
    lines: [
      { time: "0:00", text: "Oi, gente, tudo bem?", mark: "cut", note: "o gancho demora demais" },
      { time: "0:03", text: "Então, antes de tudo…", mark: "cut", note: "0:04 — a atenção cai aqui" },
      { time: "0:06", text: "30 dias sem café.", mark: "keep", note: "o ponto alto. mantém!" },
    ],
    decide: "você decide",
    accepted: "3 aceitas",
    skipped: "1 ignorada",
  },
  es: {
    kicker: "Copiloto de edición de video con IA · para creadores",
    title: ["Tu Reel tiene", "un segundo flojo."],
    circledBefore: "Te lo ",
    circled: "marcamos",
    circledAfter: ".",
    tagline: "IA que edita contigo, no por ti.",
    example: "Ejemplo",
    lines: [
      { time: "0:00", text: "Hola, ¿cómo están?", mark: "cut", note: "el gancho tarda demasiado" },
      { time: "0:03", text: "Entonces, antes que nada…", mark: "cut", note: "0:04 — aquí cae la atención" },
      { time: "0:06", text: "30 días sin café.", mark: "keep", note: "el momento clave. ¡mantenlo!" },
    ],
    decide: "tú decides",
    accepted: "3 aceptadas",
    skipped: "1 descartada",
  },
};

/* As cores do tema escuro do site (globals.css): papel escuro, tinta creme, caneta azul clara. */
const C = {
  paper: "#17140f",
  raised: "#201c17",
  ink: "#f4ecdf",
  muted: "#b3a797",
  line: "#3a322a",
  pen: "#8faaf0",
  kraft: "#c9824a",
  kraftInk: "#ddb088",
  marker: "#7a6420",
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

/** Todos os textos de um idioma, para baixar só os caracteres que a imagem usa. */
function allText(copy: Copy): string {
  const lines = copy.lines.flatMap((line) => [line.time, line.text, line.note]);
  return ["publishub", "getpublishub.com", "→", copy.kicker.toUpperCase(), copy.example.toUpperCase(), ...copy.title, copy.circledBefore, copy.circled, copy.circledAfter, copy.tagline, copy.example, copy.decide, copy.accepted, copy.skipped, ...lines].join(" ");
}

/** O caderno do editor, o mesmo desenho de components/Logo.tsx (com a caneta do tema escuro). */
function Mark({ height }: { height: number }) {
  return (
    <svg width={(height * 104) / 120} height={height} viewBox="0 0 104 120">
      <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A" />
      <rect x="14" y="93" width="54" height="9" rx="4.5" fill="#FBF3E6" />
      <rect x="54" y="8" width="8" height="104" fill="#1E1B18" />
      <g transform="rotate(20 75 58)" fill={C.pen}>
        <rect x="70" y="8" width="10" height="80" rx="5" />
        <rect x="81" y="12" width="3.4" height="26" rx="1.7" />
        <path d="M70.5 86 L79.5 86 L75 99 Z" />
      </g>
    </svg>
  );
}

/** "Guia · 6 min de leitura", no idioma do guia. */
const GUIDE_LABEL: Record<AppLocale, (minutes: number) => string> = {
  en: (minutes) => `Guide · ${minutes} min read`,
  "pt-BR": (minutes) => `Guia · ${minutes} min de leitura`,
  es: (minutes) => `Guía · ${minutes} min de lectura`,
};

const IMAGE_OPTIONS = { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } };

/** A prévia de um guia: a marca, o rótulo, o título grande e a frase da caneta. */
async function guideImage(guide: Guide) {
  const copy = COPY[guide.locale];
  const label = GUIDE_LABEL[guide.locale](guide.minutes).toUpperCase();
  const everything = ["publishub", "getpublishub.com", label, guide.title, copy.tagline].join(" ");
  const [bold, semibold, hand] = await Promise.all([
    googleFont("Bricolage+Grotesque", 800, everything),
    googleFont("Bricolage+Grotesque", 600, everything),
    googleFont("Caveat", 700, everything),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Bricolage", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(semibold ? [{ name: "Bricolage", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
    ...(hand ? [{ name: "Caveat", data: hand, weight: 400 as const, style: "normal" as const }] : []),
  ];
  const sans = bold || semibold ? "Bricolage" : undefined;
  const handFont = hand ? "Caveat" : sans;
  // títulos longos em letra menor, para caberem em três linhas
  const titleSize = guide.title.length > 56 ? 60 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          backgroundColor: C.paper,
          color: C.ink,
          fontFamily: sans,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Mark height={46} />
          <div style={{ display: "flex", fontFamily: handFont, fontSize: 46, color: C.ink }}>publishub</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignSelf: "flex-start", backgroundColor: C.ink, color: C.paper, borderRadius: 4, padding: "5px 12px", fontSize: 18, fontWeight: 600, letterSpacing: 1.6 }}>
            {label}
          </div>
          <div style={{ display: "flex", marginTop: 24, maxWidth: 1040, fontSize: titleSize, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2.5 }}>{guide.title}</div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontFamily: handFont, fontSize: 38, color: C.pen }}>{copy.tagline}</div>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 600, color: C.muted }}>getpublishub.com</div>
        </div>
      </div>
    ),
    { ...IMAGE_OPTIONS, fonts: fonts.length ? fonts : undefined },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const guide = findGuide(params.get("guide") ?? "");
  if (guide) return guideImage(guide);

  const lang = params.get("lang");
  const copy = COPY[isLocale(lang) ? lang : "en"];
  const everything = allText(copy);
  const [bold, semibold, hand] = await Promise.all([
    googleFont("Bricolage+Grotesque", 800, everything),
    googleFont("Bricolage+Grotesque", 600, everything),
    googleFont("Caveat", 700, everything),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Bricolage", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(semibold ? [{ name: "Bricolage", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
    ...(hand ? [{ name: "Caveat", data: hand, weight: 400 as const, style: "normal" as const }] : []),
  ];
  const sans = bold || semibold ? "Bricolage" : undefined;
  const handFont = hand ? "Caveat" : sans;
  const titleLine = { display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3 } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
          padding: "56px 64px",
          backgroundColor: C.paper,
          color: C.ink,
          fontFamily: sans,
        }}
      >
        {/* esquerda: a marca, o que o produto é e a promessa do hero */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mark height={46} />
            <div style={{ display: "flex", fontFamily: handFont, fontSize: 46, color: C.ink }}>publishub</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignSelf: "flex-start", backgroundColor: C.ink, color: C.paper, borderRadius: 4, padding: "5px 12px", fontSize: 16, fontWeight: 600, letterSpacing: 1.6 }}>
              {copy.kicker.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
              <div style={titleLine}>{copy.title[0]}</div>
              <div style={titleLine}>{copy.title[1]}</div>
              <div style={{ ...titleLine, alignItems: "center" }}>
                <span>{copy.circledBefore}</span>
                {/* a palavra circulada à caneta, como no hero */}
                <div style={{ position: "relative", display: "flex", margin: "0 6px 0 14px" }}>
                  {copy.circled}
                  <svg width="124%" height="140%" viewBox="0 0 400 140" preserveAspectRatio="none" style={{ position: "absolute", left: "-12%", top: "-18%" }}>
                    <path d="M30 78 C 30 20, 360 10, 378 64 C 392 112, 120 132, 40 104 C 6 92, 18 52, 70 34" fill="none" stroke={C.pen} strokeWidth="7" strokeLinecap="round" />
                  </svg>
                </div>
                <span>{copy.circledAfter}</span>
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 20, fontFamily: handFont, fontSize: 38, color: C.pen }}>{copy.tagline}</div>
          </div>

          <div style={{ display: "flex", fontSize: 21, fontWeight: 600, color: C.muted }}>getpublishub.com</div>
        </div>

        {/* direita: o copiloto revisando o vídeo, com as notas na margem e a decisão no fim */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 448,
            borderRadius: 24,
            border: `3px solid ${C.ink}`,
            backgroundColor: C.raised,
            padding: "26px 28px",
            boxShadow: `8px 8px 0 ${C.ink}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 600, letterSpacing: 1.2, color: C.muted, border: `1.5px solid ${C.muted}`, borderRadius: 999, padding: "3px 11px" }}>
              {copy.example.toUpperCase()}
            </div>
          </div>

          {copy.lines.map((line, index) => (
            <div key={line.time} style={{ display: "flex", flexDirection: "column", paddingTop: 12, paddingBottom: 12, borderBottom: index < copy.lines.length - 1 ? `1.5px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <div style={{ display: "flex", width: 40, fontSize: 15, fontWeight: 600, color: C.muted }}>{line.time}</div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 21,
                    color: line.mark === "cut" ? C.muted : C.ink,
                    textDecoration: line.mark === "cut" ? "line-through" : "none",
                    backgroundColor: line.mark === "keep" ? C.marker : "transparent",
                    padding: line.mark === "keep" ? "0 4px" : 0,
                  }}
                >
                  {line.text}
                </div>
              </div>
              <div style={{ display: "flex", marginTop: 4, marginLeft: 54, fontFamily: handFont, fontSize: 28, lineHeight: 1, color: line.mark === "keep" ? C.kraftInk : C.pen }}>{line.note}</div>
            </div>
          ))}

          {/* a decisão é sempre de quem fez o vídeo */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 16, borderRadius: 16, backgroundColor: C.ink, color: C.paper, padding: "14px 18px" }}>
            <div style={{ display: "flex", fontFamily: handFont, fontSize: 30, lineHeight: 1, color: C.paper }}>{copy.decide} →</div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 17, fontWeight: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, backgroundColor: C.paper, color: C.ink, borderRadius: 8, padding: "4px 12px" }}>
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M2 7.5 L5.5 11 L12 3" fill="none" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {copy.accepted}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, border: `1.5px solid ${C.paper}`, borderRadius: 8, padding: "3px 12px" }}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke={C.paper} strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                {copy.skipped}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...IMAGE_OPTIONS, fonts: fonts.length ? fonts : undefined },
  );
}
