import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress, tween } from "../anim";
import { Lockup } from "../components/Logo";
import { FONT } from "../theme";
import CAST from "./cast.json";
import { CUT, Editor } from "./Editor";
import { Callout, Chip, Cursor, Headline, rise as riseStyle, ScreenCard, Shot, toScreen, viewAt, type Key } from "./parts";
import { COPY, D, LAYOUT, T } from "./theme";

const S = LAYOUT.screen;
const H = T.hook;
const P = T.problem;
const M = T.meet;
const DM = T.demo;
const PO = T.payoff;
const CT = T.cta;

/* Uma frase por vez no topo: entra subindo, sai subindo. */
function Line({ text, start, end, size = 92, accent = [] as string[] }: { text: string; start: number; end: number; size?: number; accent?: string[] }) {
  const frame = useCurrentFrame();
  if (frame < start - 2 || frame > end + 10) return null;
  const words = text.split(" ");
  return <Headline lines={[words]} start={start} exit={end} size={size} top={LAYOUT.headlineTop + 40} accent={accent} stagger={2} />;
}

/* ============ 1 + 2. Gancho e problema: o editor de quem criou o Reel ============ */
export function Intro() {
  const frame = useCurrentFrame();
  if (frame >= M.logo + 14) return null;
  const focus = progress(frame, P.slowIntro - 6, 22, easeInOut);
  const leave = progress(frame, P.out, 14, easeIn); // o editor recua e some para a marca entrar
  const punch = 1.05 - 0.05 * progress(frame, 0, 10); // o corte seco do começo
  return (
    <AbsoluteFill>
      {/* o gancho */}
      <Headline lines={COPY.hook} start={H.words[0]} exit={H.out} accent={["LOSING", "INTEREST?"]} size={96} top={LAYOUT.headlineTop - 10} stagger={3} />
      {/* o problema, uma frase por vez */}
      <Line text={COPY.problem[0]} start={P.slowIntro} end={P.weakPacing - 10} accent={["intros."]} />
      <Line text={COPY.problem[1]} start={P.weakPacing} end={P.missed - 10} accent={["pacing."]} />
      <Line text={COPY.problem[2]} start={P.missed} end={P.out} accent={["opportunities."]} size={86} />

      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch * (1 - 0.12 * leave)}) translateY(${leave * 60}px)`, opacity: 1 - leave, transformOrigin: "50% 60%" }}>
        <Editor
          x={S.x - 10}
          y={S.y}
          w={S.w + 20}
          h={S.h}
          focus={focus}
          playhead={frame / T.fps}
          marks={[
            { from: 0, to: 3.74, label: "Slow intro", start: P.slowIntro },
            { from: 8.1, to: 10.42, label: "2 s pause", start: P.pause },
            { from: 3.76, to: 8.1, label: "Weak pacing", start: P.weakPacing, row: 1 },
          ]}
          hookMark={P.missed}
        />
        {/* quem editou hesita antes de postar */}
        <Cursor path={[{ at: H.cursorStart, x: 760, y: 1250 }, { at: H.cursorArrive, x: 880, y: 535 }, { at: 92, x: 860, y: 590 }, { at: 106, x: 884, y: 540 }, { at: H.hesitate[1], x: 830, y: 660 }, { at: 150, x: 700, y: 1000 }]} />
      </div>
    </AbsoluteFill>
  );
}

/* ============ 3. A Publishub: o teste grátis real, do envio à análise ============ */
export function Meet() {
  const frame = useCurrentFrame();
  if (frame < M.logo - 2 || frame >= DM.in + 12) return null;
  const card = progress(frame, M.phoneIn, 18, easeOut);
  const logoUp = progress(frame, M.phoneIn - 8, 18, easeInOut);
  const out = progress(frame, M.out, 10, easeIn);

  // a gravação: tela vazia → arquivo escolhido → envio (24 quadros reais) → análise em andamento
  let src = "ad38/screens/01-try.png";
  if (frame >= M.picked) src = "ad38/screens/02-picked.png";
  if (frame >= M.uploadStart) {
    const i = Math.min(CAST.upload.length - 1, Math.floor(((frame - M.uploadStart) / (M.uploadEnd - M.uploadStart)) * CAST.upload.length));
    src = `ad38/cast/${CAST.upload[i]}`;
  }
  if (frame >= M.processing) src = `ad38/cast/${CAST.processing}`;
  const keys: Key[] = [
    { at: 0, view: { y: 118, w: 480, x: -24 } },
    { at: M.processing + 2, view: { y: 360 }, dur: 26 },
  ];
  const view = viewAt(frame, keys);
  const btn = toScreen({ x: 20, y: 470, w: 392, h: 48 }, view, S.w); // "Get the prediction"

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 236, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${mix(1.25, 1, logoUp)})` }}>
        <Lockup size={64} build={progress(frame, M.logo, 18)} word={progress(frame, M.logo + 6, 14)} variant="color" color={D.ink} pen={D.accent} />
      </div>
      <Headline lines={[["MEET", "PUBLISHUB"]]} start={M.headline} accent={["PUBLISHUB"]} size={96} top={LAYOUT.headlineTop + 70} stagger={4} />
      <div style={{ position: "absolute", top: LAYOUT.headlineTop + 186, left: 0, right: 0, textAlign: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: 42, letterSpacing: "-0.02em", color: D.muted, ...riseStyle(frame, M.headline + 10) }}>{COPY.meetSub}</div>
      <ScreenCard x={S.x} y={S.y + 130 + (1 - card) * 240} w={S.w} h={S.h - 130} style={{ opacity: card }} label="getpublishub.com · free test">
        <Shot src={src} view={view} w={S.w} h={S.h - 130} />
        <Cursor path={[{ at: M.picked - 4, x: 640, y: 760 }, { at: M.tap - 2, x: btn.x + 420, y: btn.y + 50 }, { at: M.uploadStart + 20, x: btn.x + 470, y: btn.y + 160 }]} tapAt={[M.tap]} />
      </ScreenCard>
    </AbsoluteFill>
  );
}

/* ============ 4. O resultado real: a queda, o porquê e o plano ============ */
const DEMO_KEYS: Key[] = [
  { at: 0, view: { y: 96, w: 480, x: -24 } },
  { at: DM.spot + 16, view: { y: 596 }, dur: 20 },
  { at: DM.pan1, view: { y: 1100 }, dur: 20 },
  { at: DM.find - 6, view: { y: 1390 }, dur: 22 },
  { at: DM.pan2, view: { y: 1936 }, dur: 22 },
  { at: 700, view: { y: 2230 }, dur: 26 },
];

export function Demo() {
  const frame = useCurrentFrame();
  if (frame < DM.in - 2 || frame >= PO.toEdit + 14) return null;
  const enter = progress(frame, DM.in, 16, easeOut);
  const toPayoff = frame >= DM.out;
  const view = viewAt(frame, toPayoff ? [{ at: 0, view: { y: 2230 } }, { at: DM.out, view: { y: 1936 }, dur: 14 }] : DEMO_KEYS);
  const doneMix = progress(frame, PO.done, 6);
  const leave = progress(frame, PO.toEdit, 8, easeIn);
  const R = (r: { x: number; y: number; w: number; h: number }) => toScreen(r, view, S.w);

  const badge = R({ x: 123, y: 192, w: 142, h: 28 });
  const quote = R({ x: 45, y: 700, w: 342, h: 48 });
  const test = R({ x: 49, y: 1612, w: 334, h: 192 });
  const impact1 = R({ x: 20, y: 2005, w: 392, h: 103 });
  const item2 = R({ x: 20, y: 2308, w: 392, h: 103 });
  const markDone = R({ x: 20, y: 2246, w: 105, h: 36 });
  const doneHead = R({ x: 20, y: 1953, w: 300, h: 22 });

  return (
    <AbsoluteFill style={{ opacity: 1 - leave }}>
      {!toPayoff && (
        <>
          <Line text={COPY.demo[0]} start={DM.spot} end={DM.find - 8} size={80} accent={["weak", "moments"]} />
          <Line text={COPY.demo[1]} start={DM.find} end={DM.confident - 8} size={72} accent={["improve"]} />
          <Line text={COPY.demo[2]} start={DM.confident} end={DM.out - 8} size={76} accent={["confidence"]} />
        </>
      )}
      <ScreenCard x={S.x} y={S.y + (1 - enter) * 200} w={S.w} h={S.h} style={{ opacity: enter }} label={toPayoff ? undefined : "Real analysis · demo Reel"}>
        <Shot src="ad38/screens/result-full.png" view={view} w={S.w} h={S.h} />
        {doneMix > 0 && <Shot src="ad38/screens/done-full.png" view={view} w={S.w} h={S.h} opacity={doneMix} />}
        {!toPayoff && (
          <>
            <Callout {...badge} start={DM.spot} end={DM.spot + 18} radius={30} />
            <Callout {...quote} start={DM.spot + 30} end={DM.pan1} />
            <Callout {...test} start={DM.find + 14} end={DM.pan2} />
            <Callout {...impact1} start={DM.confident} end={700} />
            <Callout {...item2} start={712} end={DM.out} />
          </>
        )}
        {toPayoff && (
          <>
            <Cursor path={[{ at: DM.out + 16, x: 700, y: 780 }, { at: PO.tapDone - 2, x: markDone.x + 60, y: markDone.y + 22 }, { at: PO.toEdit, x: markDone.x + 140, y: markDone.y + 120 }]} tapAt={[PO.tapDone]} />
            <Callout {...doneHead} start={PO.done + 4} radius={14} />
          </>
        )}
      </ScreenCard>
    </AbsoluteFill>
  );
}

/* ============ 5. A virada: a sugestão aplicada no editor, pronto para postar ============ */
export function Payoff() {
  const frame = useCurrentFrame();
  if (frame < PO.headline - 2 || frame >= CT.logo + 12) return null;
  const editIn = progress(frame, PO.toEdit + 8, 14, easeOut);
  const collapse = progress(frame, PO.collapse[0], PO.collapse[1] - PO.collapse[0], easeInOut);
  const out = progress(frame, PO.out, 10, easeIn);
  const edited = frame >= PO.edited;
  const playhead = edited ? CUT + (frame - PO.edited) / T.fps : 0;
  const post = progress(frame, PO.ready, 10);
  const snip = progress(frame, PO.cut, 10);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Headline lines={COPY.payoff} start={PO.headline} exit={PO.out - 4} accent={["INTENTIONAL"]} size={84} top={LAYOUT.headlineTop - 34} stagger={3} />
      {editIn > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: editIn, transform: `translateY(${(1 - editIn) * 160}px)` }}>
          <Editor
            x={S.x - 10}
            y={S.y}
            w={S.w + 20}
            h={S.h}
            focus={0.55}
            video={edited ? "ad38/demo-edited.mp4" : "ad38/demo-reel.mp4"}
            videoStart={edited ? PO.edited : PO.toEdit}
            playhead={playhead}
            marks={[{ from: 0, to: CUT, label: "Suggestions 01 + 02 · cut", start: PO.toEdit + 6, color: D.accent }]}
            collapse={collapse}
            post={post}
            durationLabel={collapse > 0.5 ? "0:22 → 0:11" : "0:22"}
          />
          {/* a lâmina: um traço que corre a altura da timeline no instante do corte */}
          {snip > 0 && snip < 1 && <div style={{ position: "absolute", left: S.x + 26, top: S.y + 380, width: 6, height: 420, backgroundColor: "#fff", opacity: 1 - snip, boxShadow: "0 0 30px rgba(255,255,255,0.9)" }} />}
          <Cursor path={[{ at: PO.edited + 8, x: 620, y: 1100 }, { at: PO.ready - 2, x: S.x + S.w - 110, y: S.y + 52 }, { at: PO.out, x: S.x + S.w - 60, y: S.y + 140 }]} tapAt={[PO.ready]} />
        </div>
      )}
    </AbsoluteFill>
  );
}

/* ============ 6. Chamada: a marca, a tela real e o endereço ============ */
export function Cta() {
  const frame = useCurrentFrame();
  if (frame < CT.logo - 2) return null;
  const card = progress(frame, CT.phone, 18, easeOut);
  const url = progress(frame, CT.url, 14, easeOut);
  const note = progress(frame, CT.url + 10, 14, easeOut);
  const shine = tween(frame, [CT.url + 8, CT.url + 38], [-30, 130]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 236, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Lockup size={72} build={progress(frame, CT.logo, 18)} word={progress(frame, CT.logo + 6, 14)} variant="color" color={D.ink} pen={D.accent} />
      </div>
      <Headline lines={COPY.cta} start={CT.line} accent={["STARTS", "HERE"]} size={92} top={380} stagger={3} />
      <ScreenCard x={190} y={640 + (1 - card) * 160} w={700} h={470} style={{ opacity: card }}>
        <Shot src="ad38/screens/01-try.png" view={{ y: 72, w: 432, x: 0 }} w={700} h={470} />
      </ScreenCard>
      <div style={{ position: "absolute", top: 1150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: url, transform: `translateY(${(1 - url) * 30}px)` }}>
        <div style={{ fontFamily: FONT.sans, fontSize: 40, fontWeight: 600, color: D.muted }}>Try it at</div>
        <div style={{ position: "relative", overflow: "hidden", padding: "22px 52px", borderRadius: 999, backgroundColor: D.accent, color: D.onAccent, fontFamily: FONT.sans, fontWeight: 750, fontSize: 64, letterSpacing: "-0.02em", boxShadow: "0 20px 60px rgba(143,170,240,0.35)" }}>
          {COPY.url}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${shine}%`, width: "18%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", transform: "skewX(-20deg)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1420, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: note }}>
        <Chip color={D.muted} bg="rgba(244,236,223,0.08)">{COPY.ctaNote}</Chip>
      </div>
    </AbsoluteFill>
  );
}

