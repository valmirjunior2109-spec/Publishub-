import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, easeOut, mix, progress } from "../anim";
import { Lockup } from "../components/Logo";
import { ProductWindow, type Layout } from "../components/ProductWindow";
import { w, Words } from "../components/Words";
import { C, FONT } from "../theme";
import T from "../timeline.json";

/**
 * Cenas 2 e 3 (3–12 s): a marca se monta no centro e sobe; a janela de análise
 * chega de baixo e fica. A partir daí uma câmera percorre a própria interface:
 * primeiro a curva e a queda, depois o plano de edição. A copy troca por cima,
 * no caramelo, sem tampar o produto.
 */

/* Câmera: em cada marco, qual ponto da janela (px já com zoom) fica em qual
   ponto da tela, e com que escala. Entre os marcos, ida e volta suave. */
interface Key {
  f: number;
  s: number;
  focus: [number, number];
  at: [number, number];
}

const L = {
  vertical: {
    W: 1080,
    H: 1920,
    windowW: 987,
    logo: { center: [540, 900], top: [540, 214], big: 92, small: 38 },
    copy: { left: 80, top: 312, fontSize: 92 },
    meet: [w("Meet your AI"), w("video copilot.")],
    weak: [w("Find the"), w("weak spots.")],
    count: [w("Make every"), w("second count.")],
    // a janela fica parada embaixo da copy; quem anda é o conteúdo (ProductWindow, scroll)
    keys: [
      { f: 178, s: 1, focus: [493.5, 0], at: [540, 566] },
      { f: 210, s: 1, focus: [493.5, 0], at: [540, 560] },
      { f: 244, s: 1.03, focus: [493.5, 500], at: [540, 1052] },
      { f: 284, s: 1.03, focus: [493.5, 500], at: [540, 1048] },
      { f: 310, s: 1, focus: [493.5, 0], at: [540, 556] },
      { f: 366, s: 1, focus: [493.5, 0], at: [540, 550] },
    ] as Key[],
  },
  horizontal: {
    W: 1920,
    H: 1080,
    windowW: 1711,
    logo: { center: [960, 520], top: [1848, 96], big: 96, small: 34 },
    copy: { left: 72, top: 74, fontSize: 80 },
    meet: [w("Meet your AI video copilot.")],
    weak: [w("Find the weak spots.")],
    count: [w("Make every second count.")],
    keys: [
      // a janela inteira, centrada (1711 × 1,05 = 1797 px: 62 px de margem); o foco vem do
      // véu (ProductWindow) e de um deslize lateral curto
      { f: 178, s: 1, focus: [855, 0], at: [960, 262] },
      { f: 210, s: 1, focus: [855, 0], at: [960, 256] },
      { f: 244, s: 1.05, focus: [855, 355], at: [968, 606] },
      { f: 284, s: 1.05, focus: [855, 355], at: [966, 604] },
      { f: 310, s: 1.05, focus: [855, 355], at: [952, 606] },
      { f: 366, s: 1.05, focus: [855, 355], at: [950, 602] },
    ] as Key[],
  },
};

function camera(f: number, keys: Key[], originX: number) {
  let a = keys[0];
  let b = keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (f >= keys[i].f) {
      a = keys[i];
      b = keys[i + 1];
    }
  }
  const t = f <= a.f ? 0 : f >= b.f ? 1 : easeInOut((f - a.f) / (b.f - a.f));
  const s = mix(a.s, b.s, t);
  const fx = mix(a.focus[0], b.focus[0], t);
  const fy = mix(a.focus[1], b.focus[1], t);
  const ax = mix(a.at[0], b.at[0], t);
  const ay = mix(a.at[1], b.at[1], t);
  // a janela nasce em (originX, 0); escala a partir do canto, depois leva o foco ao alvo
  return { s, x: ax - originX - fx * s, y: ay - fy * s };
}

export function Product({ layout }: { layout: Layout }) {
  const f = useCurrentFrame();
  const l = L[layout];
  const r = T.reveal;
  const d = T.demo;
  const e = T.end;

  // a marca: monta no centro, depois sobe e encolhe para o canto dela
  const build = progress(f, r.logo, 22, easeOut);
  const word = progress(f, r.logo + 10, 14, easeOut);
  const settle = progress(f, r.logoSettle, 18, easeInOut);
  const logoX = mix(l.logo.center[0], l.logo.top[0], settle);
  const logoY = mix(l.logo.center[1], l.logo.top[1], settle);
  const logoSize = mix(l.logo.big, l.logo.small, settle);
  const logoOut = progress(f, e.start - 10, 8, easeIn);
  // no horizontal o logo vai para a direita: ancora pelo fim quando assenta
  const anchor = layout === "horizontal" ? mix(-50, -100, settle) : -50;

  // a janela: sobe de baixo, inclinada, e assenta; na saída, desce e some
  const enter = progress(f, r.window, 40, easeOut);
  // sai junto com a última frase: o palco fica limpo antes do fechamento
  const exit = progress(f, e.start - 13, 15, easeIn);
  const cam = camera(f, l.keys, (l.W - l.windowW) / 2);

  return (
    <AbsoluteFill style={{ background: C.caramel, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: (l.W - l.windowW) / 2,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${cam.x}px, ${cam.y + (1 - enter) * l.H * 0.62 + exit * 260}px) scale(${cam.s * mix(0.94, 1, enter) * mix(1, 0.96, exit)})`,
          opacity: interpolate(enter, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }) * (1 - exit),
        }}
      >
        <div style={{ perspective: 2400, perspectiveOrigin: "50% 0%" }}>
          <div style={{ transform: `rotateX(${(1 - enter) * 26}deg)`, transformOrigin: "50% 0%" }}>
            <ProductWindow layout={layout} />
          </div>
        </div>
      </div>

      {/* cada frase termina de sair antes da próxima entrar: nada se sobrepõe */}
      <Words lines={l.meet} start={r.headline} stagger={3} exit={d.copy1 - 13} style={copyStyle(l.copy)} />
      <Words lines={l.weak} start={d.copy1 + 1} stagger={3} exit={d.copy2 - 12} style={copyStyle(l.copy)} />
      <Words lines={l.count} start={d.copy2 + 1} stagger={3} exit={e.start - 12} style={copyStyle(l.copy)} />

      <div style={{ position: "absolute", left: logoX, top: logoY, transform: `translate(${anchor}%, -50%)`, opacity: 1 - logoOut }}>
        <Lockup size={logoSize} build={build} word={word} />
      </div>
    </AbsoluteFill>
  );
}

function copyStyle(c: { left: number; top: number; fontSize: number }) {
  return {
    position: "absolute" as const,
    left: c.left,
    top: c.top,
    fontFamily: FONT.sans,
    fontWeight: 600,
    fontSize: c.fontSize,
    lineHeight: 1.02,
    letterSpacing: "-0.045em",
    color: C.ink,
  };
}

