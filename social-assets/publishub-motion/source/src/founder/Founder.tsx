import type { CSSProperties } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { RetentionCurve } from "../components/RetentionCurve";
import { Hand, HandArrow, leave, enter, MONO, SANS, Serif, type Line } from "../components/Type";
import { BrandLockup } from "../demo/Brand";
import { LOST, SAMPLE } from "../theme";
import T from "./timeline.json";

/* ==========================================================================
   Founder · Valmir, construindo a Publishub em público. 9:16, 21,6 s, sem rosto.
   Tudo o que aparece é verdade e vem do repositório ou do site:
   - os commits por hora são os do Valmir no main (fuso de Salvador, −03:00),
     112 de 164 entre 20h e 5h; as mensagens do log são as reais;
   - 252 commits e 73 pull requests desde o "Initial commit" de 10 set. 2026;
   - "self-taught developer and UGC creator", "evenings and lunch breaks",
     @valmir.pdf: a faixa do fundador da landing (Landing.founder, content/founder.ts);
   - o site em 11 idiomas (frontend/messages).
   Cores: o tema escuro do site de noite, o creme de dia. Fraunces, Geist e Caveat.
   Os quadros estão em timeline.json; a trilha (make-sound-founder.mjs) lê o mesmo.
   ========================================================================== */

export const FOUNDER_FPS = T.fps;
export const FOUNDER_FRAMES = T.durationInFrames;

/* o tema escuro do site (globals.css, .dark) */
const N = { bg: "#17140F", raised: "#201C17", line: "#3A322A", ink: "#F4ECDF", muted: "#B3A797", caramel: "#D18E57", caramelInk: "#E0A36F" };
/* o tema claro */
const D = { paper: "#F6F0E4", stage: "#F0E2CA", raised: "#FFFDF8", ink: "#1E1B18", muted: "#5C544B", line: "#E4D6C1", caramel: "#C9824A", caramelInk: "#8A4F22", accent: "#1F47A6", term: "#1E1B18" };

const X = 80; // margem dos textos

/* ---------------------------------------------------------------- dados reais */

// commits do Valmir no main por hora do dia (−03:00), sem merges: git log --no-merges
const HOURS = [10, 3, 3, 0, 0, 0, 0, 1, 1, 0, 1, 6, 1, 10, 4, 12, 2, 2, 3, 9, 20, 32, 25, 19];
const NIGHT_COMMITS = HOURS.reduce((a, v, h) => a + (h >= 20 || h < 5 ? v : 0), 0); // 112
const MY_COMMITS = HOURS.reduce((a, v) => a + v, 0); // 164

// mensagens reais do log (as longas cortadas com reticências, no próprio CSS)
const LOG: [string, string][] = [
  ["Sep 15 · 23:45", "IA: explicações no idioma do site, reescritas no idioma do vídeo"],
  ["Sep 17 · 23:05", "análise: o que não depende de nada roda junto"],
  ["Sep 20 · 00:13", "idioma: quem chega com o navegador em pt-BR já cai no site em português"],
  ["Sep 20 · 01:34", "previsão cega: a aposta no segundo da queda, sem cadastro"],
  ["Sep 20 · 02:34", "espera e erro: quatro etapas visíveis e cada falha com a saída dela"],
  ["Sep 21 · 00:47", "boot: recuperar análises e edições separadamente"],
  ["Sep 25 · 23:24", "idioma: a troca não mistura mais dois idiomas na mesma tela"],
  ["Sep 28 · 23:28", 'logo sem o "b" cortado e hero sem travessões'],
  ["Oct 02 · 23:54", "tela de edição mais objetiva: um vídeo só, cortes compactos e abas"],
  ["Oct 04 · 22:07", 'logo: o nome "publishub" escrito à mão'],
  ["Oct 05 · 22:43", "logo: Publishub com o P maiúsculo"],
  ["Oct 12 · 00:07", "fix(frontend): backend em produção nunca cai em localhost"],
  ["Oct 15 · 23:19", "feat: planos Creator, Pro e Founder Lifetime com assinatura no Stripe"],
  ["Oct 22 · 22:34", 'feat(seo): Hook Lab como "AI hook generator" nos 11 idiomas'],
];
const GLOW_ROW = 4; // o das 02:34

const LANGS = ["EN", "PT", "ES", "FR", "DE", "IT", "JA", "KO", "HI", "ID", "TR"];
const COMMIT_MSG = `'logo: o nome "publishub" escrito à mão'`;

/* ---------------------------------------------------------------- o fundo: noite, e o dia que nasce */

function Backdrop({ f }: { f: number }) {
  const lamp = progress(f, 0, 20) * (1 - progress(f, T.product.dawn, 20));
  const warm = progress(f, T.who.alone, 40); // o horizonte esquenta antes do dia
  const dawn = progress(f, T.product.dawn, 30, easeInOut);
  const stage = progress(f, T.end.title - 8, 20, easeInOut);
  return (
    <>
      <AbsoluteFill style={{ background: N.bg }} />
      <AbsoluteFill style={{ background: "radial-gradient(900px 700px at 50% 18%, rgba(209,142,87,0.13), transparent 70%)", opacity: lamp }} />
      <AbsoluteFill style={{ background: "radial-gradient(1400px 700px at 50% 112%, rgba(209,142,87,0.35), transparent 70%)", opacity: warm * (1 - dawn) }} />
      {dawn > 0 && <div style={{ position: "absolute", left: 540 - 2600 * dawn, top: 2050 - 2600 * dawn, width: 5200 * dawn, height: 5200 * dawn, borderRadius: "50%", background: D.paper }} />}
      <AbsoluteFill style={{ background: D.stage, opacity: stage }} />
    </>
  );
}

const kicker = (color: string): CSSProperties => ({ fontFamily: MONO, fontSize: 26, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color });

/* ---------------------------------------------------------------- 1 · o gancho: o log da madrugada */

const HOOK: Line[] = [[{ t: "Most of my startup" }], [{ t: "was written" }], [{ t: "after 8 PM.", em: true }]];

function Hook({ f }: { f: number }) {
  const S = T.hook;
  if (f > S.out + 14) return null;
  const glow = progress(f, S.glow, 12);
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <div style={{ position: "absolute", left: X, top: 360, ...kicker(N.caramel), ...enter(f, S.kicker, 12, 16) }}>Valmir · build log</div>
      <Serif f={f} lines={HOOK} at={S.title} step={4} size={134} color={N.ink} emColor={N.caramelInk} style={{ position: "absolute", left: X, top: 420 }} />
      {/* o log de verdade rolando, com a linha das 02:34 acesa */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 930, height: 700, overflow: "hidden", maskImage: "linear-gradient(transparent, #000 18%, #000 75%, transparent)" }}>
        {LOG.map(([time, msg], i) => {
          const y = 40 + i * 66 - f * 0.9;
          const lit = i === GLOW_ROW ? glow : 0;
          return (
            <div key={i} style={{ position: "absolute", left: X - 20, right: X - 20, top: y, height: 58, display: "flex", alignItems: "center", gap: 26, padding: "0 20px", borderRadius: 12, background: `rgba(209,142,87,${0.16 * lit})`, fontFamily: MONO, fontSize: 28, opacity: progress(f, 2 + i * 1.5, 10) }}>
              <span style={{ color: N.caramel, flexShrink: 0 }}>{time}</span>
              <span style={{ color: lit > 0 ? mixColor(N.muted, N.ink, lit) : N.muted, opacity: 0.75 + 0.25 * lit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 2 · as horas de verdade */

const BASE_Y = 1150;
const BAR_MAX = 420;
const SLOT = (1000 - X) / 24;
const barX = (h: number) => X + h * SLOT + (SLOT - 24) / 2;
const barH = (v: number) => (v / Math.max(...HOURS)) * BAR_MAX;

function Hours({ f }: { f: number }) {
  const S = T.hours;
  if (f < S.title - 1 || f > S.out + 14) return null;
  const night = (h: number) => h >= 20 || h < 5;
  const lunch = (h: number) => h >= 11 && h <= 13;
  const count = Math.round(NIGHT_COMMITS * progress(f, S.stat, 24, easeOut));
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "Evenings" }], [{ t: "and lunch breaks.", em: true }]]} at={S.title} step={4} size={140} color={N.ink} emColor={N.caramelInk} style={{ position: "absolute", left: X, top: 240 }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={X} x2={1000} y1={BASE_Y + 2} y2={BASE_Y + 2} stroke={N.line} strokeWidth={2} opacity={progress(f, S.bars - 6, 10)} />
        {HOURS.map((v, h) => {
          const p = progress(f, S.bars + h * 1.1, 16, easeOut);
          const hl = night(h) ? progress(f, S.evening - 4, 10) : lunch(h) ? progress(f, S.lunch - 4, 10) : 0;
          const base = night(h) || lunch(h) ? "rgba(244,236,223,0.5)" : "rgba(244,236,223,0.22)";
          const fill = night(h) ? mixColor(base, N.caramel, hl) : lunch(h) ? mixColor(base, N.ink, hl) : base;
          const hgt = Math.max(6, barH(v) * p);
          return <rect key={h} x={barX(h)} y={BASE_Y - hgt} width={24} height={hgt} rx={5} fill={fill} opacity={v === 0 ? 0.35 * p : p} />;
        })}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={barX(h) + 12} y={BASE_Y + 46} textAnchor="middle" fill={N.muted} fontFamily={MONO} fontSize={24} opacity={progress(f, S.bars + 4, 12)}>
            {`${String(h).padStart(2, "0")}h`}
          </text>
        ))}
      </svg>
      <Hand f={f} at={S.evening} size={72} color={N.caramelInk} rotate={-4} style={{ position: "absolute", left: 540, top: 600 }}>
        evenings
      </Hand>
      <HandArrow f={f} at={S.evening + 8} d="M 790 640 C 850 640, 880 660, 892 700" head="M 878 684 L 893 703 L 905 682" color={N.caramelInk} style={{ left: 0, top: 0 }} />
      <Hand f={f} at={S.lunch} size={66} color={N.ink} rotate={3} style={{ position: "absolute", left: 210, top: 890 }}>
        lunch breaks
      </Hand>
      <HandArrow f={f} at={S.lunch + 8} d="M 500 960 C 540 970, 560 990, 566 1010" head="M 553 997 L 567 1013 L 578 994" color={N.ink} style={{ left: 0, top: 0 }} />
      <div style={{ position: "absolute", left: X, right: X, top: 1250, ...enter(f, S.stat, 14, 24) }}>
        <div style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: 92, letterSpacing: "-0.03em", color: N.ink, fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
          <span style={{ color: N.caramelInk }}>{count}</span> of my {MY_COMMITS} commits
        </div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: N.muted, marginTop: 14, letterSpacing: "0.02em" }}>between 8 PM and 5 AM · Salvador time (UTC−3)</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 3 · quem é */

function Who({ f }: { f: number }) {
  const S = T.who;
  if (f < S.name - 1 || f > S.out + 14) return null;
  const c = progress(f, S.count, 30, easeOut);
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <div style={{ position: "absolute", left: X, top: 290, ...kicker(N.caramel), ...enter(f, S.place, 12, 16) }}>Salvador, Bahia · Brazil</div>
      <Serif f={f} lines={[[{ t: "I’m" }, { t: "Valmir.", em: true }]]} at={S.name} step={6} size={224} color={N.ink} emColor={N.caramelInk} style={{ position: "absolute", left: X, top: 330 }} />
      <Serif f={f} lines={[[{ t: "Self-taught developer" }], [{ t: "and UGC creator.", em: true }]]} at={S.line} step={3} size={100} color={N.ink} emColor={N.caramelInk} style={{ position: "absolute", left: X, top: 600 }} />
      <div style={{ position: "absolute", left: X, right: X, top: 880, borderRadius: 32, background: N.raised, border: `2px solid ${N.line}`, padding: "40px 44px", fontFamily: MONO, ...enter(f, S.card, 16, 50) }}>
        <div style={{ fontSize: 30, color: N.muted }}>$ git log --reverse | head -1</div>
        <div style={{ fontSize: 38, color: N.ink, marginTop: 16 }}>
          <span style={{ color: N.caramel }}>Sep 10, 2026</span>  Initial commit
        </div>
        <div style={{ height: 2, background: N.line, margin: "34px 0 28px" }} />
        <div style={{ display: "flex", gap: 90 }}>
          {[
            [Math.round(252 * c), "commits"],
            [Math.round(73 * c), "pull requests"],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 130, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", color: N.ink, fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>{n}</div>
              <div style={{ fontSize: 28, color: N.muted, marginTop: 10, letterSpacing: "0.06em" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <Hand f={f} at={S.alone} size={76} color={N.caramelInk} rotate={-4} style={{ position: "absolute", left: 470, top: 1420 }}>
        building it alone
      </Hand>
      <HandArrow f={f} at={S.alone + 10} d="M 455 1452 C 400 1446, 372 1420, 366 1384" head="M 352 1400 L 365 1380 L 381 1397" color={N.caramelInk} style={{ left: 0, top: 0 }} />
    </div>
  );
}

/* ---------------------------------------------------------------- 4 · o que está construindo (de dia) */

const CARD = { x: X, y: 790, w: 1080 - 2 * X };

function Product({ f }: { f: number }) {
  const S = T.product;
  if (f < S.kicker - 1 || f > S.out + 14) return null;
  const draw = progress(f, S.card + 6, 30, easeInOut);
  const pop = progress(f, S.drop, 10);
  const lost = Math.round(LOST * progress(f, S.drop + 2, 14, easeOut));
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <div style={{ position: "absolute", left: X, top: 270, ...kicker(D.caramelInk), ...enter(f, S.kicker, 12, 16) }}>What I’m building</div>
      <div style={{ position: "absolute", left: X, top: 336 }}>
        <BrandLockup size={66} build={progress(f, S.logo, 30)} word={progress(f, S.logo + 14, 16, easeInOut)} color={D.ink} id="founder-logo" />
      </div>
      <Serif f={f} lines={[[{ t: "See where your edit" }], [{ t: "loses viewers.", em: true }]]} at={S.title} step={3} size={124} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 470 }} />
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, borderRadius: 36, background: D.raised, border: `2px solid ${D.line}`, boxShadow: "0 30px 80px rgba(80,50,20,0.14)", padding: "40px 44px 36px", ...enter(f, S.card, 18, 60) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.1em", color: D.muted }}>RETENTION</span>
          <span style={{ fontFamily: MONO, fontSize: 22, color: D.muted, border: `2px solid ${D.line}`, borderRadius: 999, padding: "6px 18px" }}>example</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 80, fontWeight: 600, letterSpacing: "-0.03em", color: D.ink, marginTop: 14, opacity: mix(0.25, 1, pop) }}>Drop at 0:04</div>
        <div style={{ fontFamily: MONO, fontSize: 38, color: D.accent, marginTop: 6, opacity: progress(f, S.drop + 2, 8) }}>−{lost}% in 2 seconds</div>
        <div style={{ marginTop: 26 }}>
          <RetentionCurve points={SAMPLE.retention} durationSec={SAMPLE.durationSec} dropAtSec={SAMPLE.dropAtSec} axisSize={24} draw={draw} pop={pop} ring={progress(f, S.drop + 2, 24)} id="founder-curve" />
        </div>
      </div>
      <Hand f={f} at={S.note} size={74} color={D.caramelInk} rotate={-3} style={{ position: "absolute", left: 400, top: 1420 }}>
        the second they left
      </Hand>
      <HandArrow f={f} at={S.note + 10} d="M 385 1456 C 290 1460, 236 1400, 224 1330" head="M 209 1348 L 223 1326 L 239 1346" color={D.caramelInk} style={{ left: 0, top: 0 }} />
    </div>
  );
}

/* ---------------------------------------------------------------- 5 · commits em português, produto no mundo */

function Global({ f }: { f: number }) {
  const S = T.global;
  if (f < S.title - 1 || f > S.out + 14) return null;
  const typed = COMMIT_MSG.slice(0, Math.max(0, Math.floor((f - S.type) * 2.2)));
  const typing = typed.length < COMMIT_MSG.length;
  return (
    <div style={{ position: "absolute", inset: 0, ...leave(f, S.out, 12) }}>
      <Serif f={f} lines={[[{ t: "My commits are" }], [{ t: "in Portuguese.", em: true }]]} at={S.title} step={3} size={112} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 270 }} />
      <div style={{ position: "absolute", left: X, right: X, top: 560, borderRadius: 28, background: D.term, padding: "36px 40px", fontFamily: MONO, fontSize: 33, lineHeight: 1.5, ...enter(f, S.commit, 14, 40) }}>
        <div style={{ color: "#B3A797" }}>$ git commit -m</div>
        <div style={{ color: "#F4ECDF", whiteSpace: "pre", minHeight: 45 }}>
          {typed}
          <span style={{ display: "inline-block", width: 16, height: 32, marginLeft: 4, verticalAlign: "-5px", background: "#D18E57", opacity: typing || Math.floor(f / 12) % 2 === 0 ? 1 : 0 }} />
        </div>
      </div>
      <Serif f={f} lines={[[{ t: "My product speaks" }], [{ t: "11 languages.", em: true }]]} at={S.title2} step={3} size={112} color={D.ink} emColor={D.caramelInk} style={{ position: "absolute", left: X, top: 850 }} />
      <div style={{ position: "absolute", left: X, right: X, top: 1130, display: "flex", flexWrap: "wrap", gap: 18 }}>
        {LANGS.map((l, i) => {
          const p = progress(f, S.chips + i * 2, 10, easeOut);
          const pt = l === "PT";
          return (
            <div key={l} style={{ width: 134, height: 92, borderRadius: 999, border: `2px solid ${pt ? D.caramel : D.line}`, background: pt ? "rgba(201,130,74,0.16)" : D.raised, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 38, fontWeight: 500, color: pt ? D.caramelInk : D.ink, opacity: p, transform: `scale(${mix(0.7, 1, p)})` }}>
              {l}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- a assinatura */

function End({ f }: { f: number }) {
  const S = T.end;
  if (f < S.title - 10) return null;
  const ring = progress(f, S.title - 6, 36, easeInOut);
  const corner = progress(f, S.name, 24, easeInOut);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* o arco caramelo da faixa do fundador na landing */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={930} cy={210} r={230} fill="none" stroke={D.caramel} strokeWidth={22} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform="rotate(100 930 210)" opacity={0.9} />
        <path d="M 70 1450 V 1680 Q 70 1720 110 1720 H 360" fill="none" stroke={D.caramel} strokeWidth={22} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - corner} />
      </svg>
      <Serif f={f} lines={[[{ t: "Building" }], [{ t: "in public.", em: true }]]} at={S.title} step={6} size={210} color={D.ink} emColor={D.caramelInk} lineHeight={1} style={{ position: "absolute", left: X, top: 470 }} />
      <div style={{ position: "absolute", left: X, top: 980, ...enter(f, S.name, 14, 24) }}>
        <div style={{ fontFamily: SANS, fontSize: 70, fontWeight: 600, letterSpacing: "-0.03em", color: D.ink }}>Valmir</div>
        <div style={{ fontFamily: SANS, fontSize: 44, color: D.muted, marginTop: 8 }}>Solo founder of Publishub</div>
      </div>
      <div style={{ position: "absolute", left: X, top: 1170, fontFamily: MONO, fontSize: 46, fontWeight: 500, color: D.accent, ...enter(f, S.handle, 14, 20) }}>@valmir.pdf</div>
      <Hand f={f} at={S.place} size={78} color={D.caramelInk} rotate={-3} style={{ position: "absolute", left: X + 4, top: 1280 }}>
        Salvador, Bahia → the world
      </Hand>
    </div>
  );
}

/* ---------------------------------------------------------------- utilidades */

/** Mistura duas cores (#hex ou rgba). */
function mixColor(a: string, b: string, t: number) {
  const pa = parse(a);
  const pb = parse(b);
  const c = pa.map((v, i) => v + (pb[i] - v) * t);
  return `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${c[3].toFixed(3)})`;
}
function parse(c: string): number[] {
  if (c.startsWith("#")) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).concat(1);
  return c.replace(/[^\d.,]/g, "").split(",").map(Number);
}

/* ---------------------------------------------------------------- a composição */

export function Founder({ sound = true }: { sound?: boolean }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: N.bg, fontFamily: SANS, overflow: "hidden" }}>
      {sound && <Audio src={staticFile("soundtrack-founder.wav")} />}
      <Backdrop f={f} />
      <Hook f={f} />
      <Hours f={f} />
      <Who f={f} />
      <Product f={f} />
      <Global f={f} />
      <End f={f} />
    </AbsoluteFill>
  );
}
