import { ImageResponse } from "next/og";
import { isLocale, type AppLocale } from "@/i18n/config";
import { findGuide, type Guide } from "@/lib/guides";
import { LogoArt, MARK_RATIO } from "@/components/LogoArt";

/**
 * A imagem que aparece quando alguém compartilha um link do Publishub (WhatsApp,
 * Instagram, X, LinkedIn) e que o Google pode usar nos resultados.
 *
 * A mesma cara da landing: o papel escuro do caderno, a promessa do hero em Geist e, ao
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

// sem hindi: o Satori não faz o shaping do devanágari (a vogal ि sai fora do lugar), então a prévia em hindi usa o inglês
const COPY: Record<Exclude<AppLocale, "hi">, Copy> = {
  en: {
    kicker: "AI video editing copilot",
    title: "Make every second of your video count.",
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
    title: "Faça cada segundo do seu vídeo valer.",
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
    title: "Haz que cada segundo de tu video cuente.",
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
  fr: {
    kicker: "Copilote de montage vidéo par IA",
    title: "Faites compter chaque seconde de votre vidéo.",
    tagline: "Une IA qui monte avec vous, pas à votre place.",
    example: "Exemple",
    window: "Analyse de votre Reel",
    lines: [
      { time: "0:00", text: "Salut tout le monde, ça va ?", mark: "cut", note: "l’accroche traîne trop" },
      { time: "0:03", text: "Alors, avant tout…", mark: "cut", note: "0:04 — l’attention chute ici" },
      { time: "0:06", text: "30 jours sans café.", mark: "keep", note: "le moment fort. à garder" },
    ],
    decide: "Vous décidez",
    accepted: "3 acceptées",
    skipped: "1 ignorée",
  },
  de: {
    kicker: "KI-Copilot für den Videoschnitt",
    title: "Lass jede Sekunde deines Videos zählen.",
    tagline: "KI, die mit dir schneidet, nicht für dich.",
    example: "Beispiel",
    window: "Analyse deines Reels",
    lines: [
      { time: "0:00", text: "Hey Leute, wie geht’s?", mark: "cut", note: "der Hook dauert zu lange" },
      { time: "0:03", text: "Also, bevor ich anfange…", mark: "cut", note: "0:04 — hier sinkt die Aufmerksamkeit" },
      { time: "0:06", text: "30 Tage ohne Kaffee.", mark: "keep", note: "der Höhepunkt. bleibt drin" },
    ],
    decide: "Du entscheidest",
    accepted: "3 angenommen",
    skipped: "1 übersprungen",
  },
  it: {
    kicker: "Copilota di montaggio video con IA",
    title: "Fai contare ogni secondo del tuo video.",
    tagline: "Un’IA che monta con te, non al posto tuo.",
    example: "Esempio",
    window: "Analisi del tuo Reel",
    lines: [
      { time: "0:00", text: "Ciao a tutti, come va?", mark: "cut", note: "il gancio è troppo lento" },
      { time: "0:03", text: "Allora, prima di tutto…", mark: "cut", note: "0:04 — qui cala l’attenzione" },
      { time: "0:06", text: "30 giorni senza caffè.", mark: "keep", note: "il momento clou. tienilo" },
    ],
    decide: "Decidi tu",
    accepted: "3 accettate",
    skipped: "1 ignorata",
  },
  id: {
    kicker: "Kopilot edit video dengan AI",
    title: "Buat setiap detik videomu berarti.",
    tagline: "AI yang mengedit bersamamu, bukan menggantikanmu.",
    example: "Contoh",
    window: "Analisis Reel kamu",
    lines: [
      { time: "0:00", text: "Hai semuanya, apa kabar?", mark: "cut", note: "hook-nya terlalu lama" },
      { time: "0:03", text: "Jadi, sebelum mulai…", mark: "cut", note: "0:04 — perhatian turun di sini" },
      { time: "0:06", text: "30 hari tanpa kopi.", mark: "keep", note: "momen utamanya. pertahankan" },
    ],
    decide: "Kamu yang memutuskan",
    accepted: "3 diterima",
    skipped: "1 dilewati",
  },
  tr: {
    kicker: "Yapay zekâ video kurgu yardımcısı",
    title: "Videonun her saniyesini değerli kıl.",
    tagline: "Senin yerine değil, seninle kurgulayan yapay zekâ.",
    example: "Örnek",
    window: "Reel’inin analizi",
    lines: [
      { time: "0:00", text: "Selam millet, nasılsınız?", mark: "cut", note: "giriş çok uzun sürüyor" },
      { time: "0:03", text: "Şimdi, her şeyden önce…", mark: "cut", note: "0:04 — dikkat burada düşüyor" },
      { time: "0:06", text: "Kahvesiz 30 gün.", mark: "keep", note: "asıl an bu. kalsın" },
    ],
    decide: "Kararı sen verirsin",
    accepted: "3 kabul edildi",
    skipped: "1 atlandı",
  },
  ja: {
    kicker: "AI動画編集コパイロット",
    title: "動画の1秒1秒を、意味のあるものに。",
    tagline: "あなたの代わりではなく、あなたと一緒に編集するAI。",
    example: "例",
    window: "あなたのリール分析",
    lines: [
      { time: "0:00", text: "みなさん、こんにちは！", mark: "cut", note: "フックが長すぎる" },
      { time: "0:03", text: "さて、まず最初に…", mark: "cut", note: "0:04 — ここで注意が落ちる" },
      { time: "0:06", text: "コーヒー断ち30日。", mark: "keep", note: "ここが見せ場。残す" },
    ],
    decide: "決めるのはあなた",
    accepted: "3件採用",
    skipped: "1件スキップ",
  },
  ko: {
    kicker: "AI 영상 편집 코파일럿",
    title: "영상의 모든 1초를 의미 있게.",
    tagline: "당신 대신이 아니라, 당신과 함께 편집하는 AI.",
    example: "예시",
    window: "릴스 분석",
    lines: [
      { time: "0:00", text: "여러분, 안녕하세요!", mark: "cut", note: "훅이 너무 길어요" },
      { time: "0:03", text: "자, 우선 먼저…", mark: "cut", note: "0:04 — 여기서 집중도가 떨어져요" },
      { time: "0:06", text: "커피 없이 30일.", mark: "keep", note: "핵심 장면. 유지" },
    ],
    decide: "결정은 당신이",
    accepted: "3개 채택",
    skipped: "1개 건너뜀",
  },
};

/* As cores do tema escuro do site (globals.css): papel escuro, tinta creme, caneta azul clara. */
const C = {
  paper: "#17140f",
  raised: "#201c17",
  surface: "#26211b",
  ink: "#f4ecdf",
  muted: "#b3a797",
  line: "#3a322a",
  accent: "#8faaf0",
  accentSoft: "#1e2840",
  confirmed: "#7fc48a",
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

/** A Geist só tem as escritas latinas: devanágari, japonês e coreano vêm da Noto, usada onde a Geist não tem o caractere. */
const SCRIPT_FONTS: [RegExp, string][] = [
  [/[\u0900-\u097F]/, "Noto+Sans+Devanagari"],
  [/[\u3040-\u30FF\u4E00-\u9FFF]/, "Noto+Sans+JP"],
  [/[\uAC00-\uD7AF\u1100-\u11FF]/, "Noto+Sans+KR"],
];

/** Geist (semibold e regular) e Geist Mono, só com os caracteres que a imagem usa, mais a Noto da escrita, se precisar. */
async function loadFonts(text: string) {
  const extra = SCRIPT_FONTS.filter(([script]) => script.test(text)).map(([, family]) => family);
  const [semibold, regular, mono, ...scripts] = await Promise.all([
    googleFont("Geist", 600, text),
    googleFont("Geist", 400, text),
    googleFont("Geist+Mono", 500, text),
    ...extra.flatMap((family) => [googleFont(family, 600, text), googleFont(family, 400, text)]),
  ]);
  const fonts = [
    ...(semibold ? [{ name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "Geist", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const }] : []),
    ...scripts.flatMap((data, index) => (data ? [{ name: "Noto Sans", data, weight: (index % 2 === 0 ? 600 : 400) as 600 | 400, style: "normal" as const }] : [])),
  ];
  return { fonts: fonts.length ? fonts : undefined, sans: semibold || regular ? "Geist" : undefined, mono: mono ? "Geist Mono" : undefined };
}

/** Todos os textos de um idioma, para baixar só os caracteres que a imagem usa. */
function allText(copy: Copy): string {
  const lines = copy.lines.flatMap((line) => [line.time, line.text, line.note]);
  return ["Publishub", "getpublishub.com", "→ ·", copy.kicker.toUpperCase(), copy.example, copy.title, copy.tagline, copy.window, copy.decide, copy.accepted, copy.skipped, ...lines].join(" ");
}

/** O caderno do editor, o mesmo desenho de components/Logo.tsx (com a caneta do tema escuro). */
function Mark({ height }: { height: number }) {
  return <LogoArt width={height * MARK_RATIO} height={height} halo={C.paper} pen={C.accent} />;
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
  fr: (minutes) => `Guide · ${minutes} min de lecture`,
  de: (minutes) => `Leitfaden · ${minutes} Min. Lesezeit`,
  it: (minutes) => `Guida · ${minutes} min di lettura`,
  hi: (minutes) => `गाइड · ${minutes} मिनट में पढ़ें`,
  id: (minutes) => `Panduan · ${minutes} menit baca`,
  tr: (minutes) => `Rehber · ${minutes} dk okuma`,
  ja: (minutes) => `ガイド · ${minutes}分で読めます`,
  ko: (minutes) => `가이드 · ${minutes}분 분량`,
};

const copyFor = (locale: AppLocale): Copy => (locale === "hi" ? COPY.en : COPY[locale]);

const IMAGE_OPTIONS = { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } };

/** A prévia de um guia: a marca, o rótulo, o título grande e a frase da marca. */
async function guideImage(guide: Guide) {
  const copy = copyFor(guide.locale);
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
  const copy = copyFor(isLocale(lang) ? lang : "en");
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
