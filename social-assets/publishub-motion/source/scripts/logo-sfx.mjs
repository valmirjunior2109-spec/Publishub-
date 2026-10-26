// Os sons do caderno do logo (NotebookLogo.tsx): o caderno pousando, a capa
// abrindo, a caneta no papel, o sublinhado, a capa fechando e a caneta
// encaixando. Usado pela trilha do logo sozinho e pela do anúncio.
// `L` é a linha do tempo do logo (quadros relativos) e `at` o quadro em que ele começa.

export function logoSfx(mix, L, at = 0) {
  const { sec, voice, biquad, noise, decay, bell, swipe } = mix;
  const t = (f) => sec(at + f);

  /** Um baque de papel e papelão: grave abafado com um pouco de ruído. */
  function thud(when, gain = 0.3) {
    const lp = biquad("lp", 700);
    voice(when, 0.4, (s) => Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-s / 0.02)) * s) * decay(s, 0.002, 0.08) + lp(noise()) * decay(s, 0.001, 0.03) * 0.8, { gain, send: 0.12 });
  }

  /** A capa virando: um sopro de papel que abre (ou fecha) o filtro. */
  function flip(when, dur, gain = 0.09, up = true) {
    const bp = biquad("bp", 800, 0.9);
    voice(when, dur, (s, i) => {
      const k = s / dur;
      if (i % 32 === 0) bp.set(up ? 600 + 2600 * k : 3200 - 2600 * k);
      return bp(noise()) * Math.sin(Math.PI * k) ** 1.5 * 2;
    }, { gain, send: 0.25 });
  }

  /** A caneta no papel: ruído agudo e granulado, no ritmo dos traços das letras. */
  function scribble(when, dur, strokes, gain = 0.06) {
    const bp = biquad("bp", 3600, 1.4);
    const hp = biquad("hp", 1500);
    voice(when, dur, (s) => {
      const k = s / dur;
      const stroke = Math.abs(Math.sin(Math.PI * strokes * k)) ** 0.6;
      const grain = noise() > 0.97 ? noise() * 1.5 : 0;
      return (bp(hp(noise())) * 1.6 + grain * 0.4) * stroke * Math.min(1, s / 0.03) * Math.min(1, (dur - s) / 0.05);
    }, { gain, pan: 0.15, send: 0.08 });
  }

  thud(t(L.appear + 6), 0.3); // o caderno pousa
  flip(t(L.open[0]), sec(L.open[1] - L.open[0]), 0.1, true);
  thud(t(L.open[1] - 1), 0.14); // a capa deita
  scribble(t(L.write[0]), sec(L.write[1] - L.write[0]), 8, 0.065);
  swipe(t(L.underline[0]), { gain: 0.04, dur: sec(L.underline[1] - L.underline[0]) });
  flip(t(L.close[0]), sec(L.close[1] - L.close[0]), 0.09, false);
  thud(t(L.close[1] - 1), 0.3); // fecha
  bell(t(L.halo), 86, { gain: 0.02, d: 0.6 }); // a caneta encaixa
}
