import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, progress } from "../anim";
import { EditorTimeline } from "../components/EditorTimeline";
import type { Layout } from "../components/ProductWindow";
import { w, Words } from "../components/Words";
import { C, FONT } from "../theme";
import T from "../timeline.json";

/**
 * Cena 1 (0–3 s): a madrugada editando. A frase entra palavra por palavra no
 * ritmo dos cortes, o relógio de edição dispara, e tudo congela na pergunta.
 * No fim, o caramelo do caderno sobe e cobre a tela: é a virada para a marca.
 */
const L = {
  vertical: {
    text: { left: 80, top: 300, fontSize: 124 },
    question: { fontSize: 116 },
    hook1: [w("You spend"), [...w("hours", C.caramel), ...w("editing.")]],
    hook2: [w("But is your"), [...w("video"), ...w("actually", C.caramel)], w("working?", C.caramel)],
    clock: { left: 80, top: 880, size: 72 },
    timeline: { top: 1040, trackH: 150, rulerH: 52 },
  },
  horizontal: {
    text: { left: 120, top: 120, fontSize: 112 },
    question: { fontSize: 112 },
    hook1: [[...w("You spend"), ...w("hours", C.caramel), ...w("editing.")]],
    hook2: [w("But is your video"), w("actually working?", C.caramel)],
    clock: { left: 120, top: 520, size: 56 },
    timeline: { top: 650, trackH: 104, rulerH: 42 },
  },
};

export function Hook({ layout }: { layout: Layout }) {
  const f = useCurrentFrame();
  const l = L[layout];
  const q = T.hook.question;
  const W = layout === "vertical" ? 1080 : 1920;

  const dim = progress(f, q, 8);
  const push = 1 + 0.04 * progress(f, q, 40, easeInOut);
  const wipe = progress(f, T.hook.wipe, 10, easeIn);

  // o relógio de edição: horas passando a cada quadro, até a pergunta
  const secs = 7092 + Math.min(f, q) * 97;
  const clock = [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60].map((n) => String(n).padStart(2, "0")).join(":");

  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 60%" }}>
        <div style={{ position: "absolute", left: 0, top: l.timeline.top, opacity: 1 - dim * 0.72, filter: `grayscale(${dim * 0.8})` }}>
          <EditorTimeline width={W} trackH={l.timeline.trackH} rulerH={l.timeline.rulerH} />
        </div>

        <div style={{ position: "absolute", left: l.clock.left, top: l.clock.top, fontFamily: FONT.mono, color: C.cream, opacity: 1 - dim * 0.6 }}>
          <div style={{ fontSize: l.clock.size * 0.36, letterSpacing: "0.1em", color: "#8A7D6B", fontWeight: 500 }}>EDIT TIME</div>
          <div style={{ fontSize: l.clock.size, fontWeight: 500, letterSpacing: "0.02em", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{clock}</div>
        </div>

        <Words
          lines={l.hook1}
          start={T.hook.words[0]}
          stagger={T.hook.words[1] - T.hook.words[0]}
          dur={9}
          // corte seco na pergunta: a frase some no quadro do boom
          exit={q}
          exitStagger={0}
          exitDur={1}
          style={{ position: "absolute", left: l.text.left, top: l.text.top, fontFamily: FONT.sans, fontWeight: 600, fontSize: l.text.fontSize, lineHeight: 1.0, letterSpacing: "-0.05em", color: C.cream }}
        />
        <Words
          lines={l.hook2}
          start={q}
          stagger={2}
          dur={9}
          style={{ position: "absolute", left: l.text.left, top: l.text.top, fontFamily: FONT.sans, fontWeight: 600, fontSize: l.question.fontSize, lineHeight: 1.0, letterSpacing: "-0.05em", color: C.cream }}
        />
      </AbsoluteFill>

      {/* a capa do caderno sobe e vira o fundo das próximas cenas */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "100%", background: C.caramel, transform: `translateY(${(1 - wipe) * 100}%)` }} />
    </AbsoluteFill>
  );
}
