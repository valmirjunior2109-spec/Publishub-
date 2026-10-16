import { ImageResponse } from "next/og";
import { createTranslator } from "next-intl";
import { LogoArt, MARK_RATIO } from "@/components/LogoArt";
import { isLocale, type AppLocale } from "@/i18n/config";
import { loadFonts } from "@/lib/ogFonts";
import { clock, fetchShared, retention, type SharedResult } from "@/lib/share";

/**
 * O cartão do resultado compartilhado, gerado no servidor.
 *
 *   /s/<token>/card?format=story&lang=pt-BR → 1080×1920, para baixar e postar nos Stories
 *   /s/<token>/card?format=og               → 1200×630, a prévia do link no WhatsApp e no X
 *
 * É o anúncio que a publishub não precisa produzir: o segundo da queda em letra
 * grande, a frase, o porquê e o endereço. Nada além do que /s/<token> já mostra.
 */

const C = {
  paper: "#f6f0e4",
  raised: "#fffdf8",
  ink: "#1e1b18",
  muted: "#5c544b",
  line: "#e4d6c1",
  accent: "#1f47a6",
  accentSoft: "#e3e9f7",
  caramel: "#8a4f22",
  refuted: "#a64a36",
};

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

async function labels(lang: string | null) {
  // sem hindi, como na /og: o gerador não faz o shaping do devanágari nos rótulos
  const locale: AppLocale = isLocale(lang) && lang !== "hi" ? lang : "en";
  const messages = (await import(`../../../../../messages/${locale}.json`)).default;
  return createTranslator({ locale, messages, namespace: "Share.card" });
}

function Brand({ size, sans }: { size: number; sans?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.35 }}>
      <LogoArt width={size * MARK_RATIO} height={size} />
      <div style={{ display: "flex", fontFamily: sans, fontSize: size * 0.75, fontWeight: 600, letterSpacing: -1, color: C.ink }}>publishub</div>
    </div>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const query = new URL(request.url).searchParams;
  const result = await fetchShared(token);
  if (!result) return new Response("Not found", { status: 404 });

  const t = await labels(query.get("lang"));
  const story = query.get("format") !== "og";
  const at = clock(result.drop.at_seconds);
  const numbers = retention(result);
  const texts = {
    kicker: t("kicker"),
    leaves: t("leaves"),
    watching: numbers ? t("watching", { before: numbers.before, after: numbers.after }) : "",
    why: t("why"),
    cta: t("cta"),
    phrase: `“${cut(result.phrase, story ? 140 : 90)}”`,
    diagnosis: cut(result.diagnosis, story ? 230 : 150),
  };
  const { fonts, sans, mono } = await loadFonts(["publishub", "getpublishub.com", at, "0123456789:%→…“”", ...Object.values(texts)].join(" "));

  return new ImageResponse(story ? <Story result={result} at={at} texts={texts} sans={sans} mono={mono} /> : <Preview at={at} texts={texts} sans={sans} mono={mono} />, {
    width: story ? 1080 : 1200,
    height: story ? 1920 : 630,
    fonts,
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}

type Texts = Record<"kicker" | "leaves" | "watching" | "why" | "cta" | "phrase" | "diagnosis", string>;

function Story({ at, texts, sans, mono }: { result: SharedResult; at: string; texts: Texts; sans?: string; mono?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "150px 90px 170px", backgroundColor: C.paper, color: C.ink, fontFamily: sans }}>
      <Brand size={64} sans={sans} />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: mono, fontSize: 30, letterSpacing: 2, color: C.accent }}>{texts.kicker.toUpperCase()}</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 300, fontWeight: 600, letterSpacing: -14, lineHeight: 1, color: C.refuted }}>{at}</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 56, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1 }}>{texts.leaves}</div>
        {texts.watching && (
          <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 30, padding: "12px 26px", borderRadius: 999, backgroundColor: C.raised, border: `2px solid ${C.line}`, fontFamily: mono, fontSize: 34, color: C.muted }}>
            {texts.watching}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 70, padding: "40px 44px", borderRadius: 36, backgroundColor: C.raised, border: `2px solid ${C.line}`, fontSize: 46, lineHeight: 1.3, letterSpacing: -0.5 }}>{texts.phrase}</div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
          <div style={{ display: "flex", fontFamily: mono, fontSize: 28, letterSpacing: 2, color: C.caramel }}>{texts.why.toUpperCase()}</div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 38, lineHeight: 1.4, color: C.muted }}>{texts.diagnosis}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignSelf: "flex-start", padding: "26px 40px", borderRadius: 999, backgroundColor: C.accent, color: C.raised, fontSize: 38, fontWeight: 600 }}>{texts.cta}</div>
    </div>
  );
}

function Preview({ at, texts, sans, mono }: { at: string; texts: Texts; sans?: string; mono?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", gap: 56, padding: "56px 64px", backgroundColor: C.paper, color: C.ink, fontFamily: sans }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 430 }}>
        <Brand size={40} sans={sans} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: mono, fontSize: 18, letterSpacing: 1.5, color: C.accent }}>{texts.kicker.toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: 180, fontWeight: 600, letterSpacing: -8, lineHeight: 1, color: C.refuted }}>{at}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>{texts.leaves}</div>
          {texts.watching && <div style={{ display: "flex", marginTop: 16, fontFamily: mono, fontSize: 22, color: C.muted }}>{texts.watching}</div>}
        </div>
        <div style={{ display: "flex", fontFamily: mono, fontSize: 20, color: C.muted }}>getpublishub.com</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 28 }}>
        <div style={{ display: "flex", padding: "28px 32px", borderRadius: 24, backgroundColor: C.raised, border: `1px solid ${C.line}`, fontSize: 32, lineHeight: 1.3 }}>{texts.phrase}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: mono, fontSize: 16, letterSpacing: 1.5, color: C.caramel }}>{texts.why.toUpperCase()}</div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 24, lineHeight: 1.4, color: C.muted }}>{texts.diagnosis}</div>
        </div>
      </div>
    </div>
  );
}
