// Os instrumentos "tech" das trilhas do anúncio e do logo, sobre o mixer de synth.mjs.
// Eletrônico limpo: bumbo 4/4 com sidechain nos acordes e no baixo, synth serrilhado,
// arpejo de onda quadrada com eco, risers, impactos, a fita parando e os toques da
// interface digitais (pings, chirps, cliques e glitches). Nada de amostras.
//
// Os bumbos precisam ser marcados antes do resto: o sidechain olha para eles.

export function createTech(m) {
  const { SR, voice, biquad, noise, decay, midi } = m;
  const kicks = []; // tempos absolutos (s) dos bumbos, para o sidechain

  /** Quanto o sidechain abaixa o som no instante `t` (1 = nada). */
  function duck(t, depth = 0.72, rel = 0.11) {
    let lo = 0;
    let hi = kicks.length - 1;
    let last = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (kicks[mid] <= t) {
        last = kicks[mid];
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return last < 0 ? 1 : 1 - depth * Math.exp(-(t - last) / rel);
  }

  /* ---------- bateria ---------- */

  function markKick(at) {
    kicks.push(at);
    kicks.sort((a, b) => a - b);
  }

  /** Bumbo seco e com ataque: senoide que cai de 160 a 45 Hz e um clique. */
  function kick(at, gain = 0.42) {
    let ph = 0;
    const hp = biquad("hp", 2000);
    voice(at, 0.42, (t) => {
      ph += (2 * Math.PI * (45 + 115 * Math.exp(-t / 0.022))) / SR;
      return Math.tanh(Math.sin(ph) * 1.6) * decay(t, 0.0015, 0.17) + hp(noise()) * decay(t, 0.0003, 0.004) * 0.8;
    }, { gain });
  }

  function hat(at, { gain = 0.03, open = false, pan = 0.2 } = {}) {
    const hp = biquad("hp", 8500);
    const bp = biquad("bp", 11000, 1.2);
    voice(at, open ? 0.3 : 0.06, (t) => (hp(noise()) * 0.7 + bp(noise()) * 0.6) * decay(t, 0.0008, open ? 0.09 : 0.016), { gain, pan, send: open ? 0.08 : 0 });
  }

  function clap(at, gain = 0.09) {
    const bp = biquad("bp", 1800, 1.3);
    const hp = biquad("hp", 900);
    voice(at, 0.3, (t) => {
      const env = [0, 0.009, 0.018].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) / 0.007) : 0), 0) + (t > 0.025 ? Math.exp(-(t - 0.025) / 0.06) * 0.7 : 0);
      return hp(bp(noise())) * env * 1.4;
    }, { gain, pan: -0.05, send: 0.3 });
  }

  /** Percussão digital: um tique metálico curtinho. */
  function perc(at, gain = 0.03, pan = 0.4) {
    voice(at, 0.05, (t) => (Math.sign(Math.sin(2 * Math.PI * 3100 * t)) * 0.5 + Math.sin(2 * Math.PI * 5200 * t)) * decay(t, 0.0004, 0.006), { gain, pan, send: 0.05 });
  }

  /* ---------- synths ---------- */

  const saw = (ph) => 2 * (ph - Math.floor(ph)) - 1;

  /**
   * Acorde de synth serrilhado (três vozes desafinadas por nota) num passa-baixa,
   * com sidechain. `cutoff(tAbs)` automatiza o filtro.
   */
  function stack(at, dur, notes, { gain = 0.035, cutoff = () => 2200, attack = 0.01, release = 0.2, side = true, width = 0.6 } = {}) {
    notes.forEach((n, k) => {
      [-1, 0, 1].forEach((d) => {
        const f = midi(n) * Math.pow(2, (d * 9) / 1200);
        const lp = biquad("lp", 2000, 0.9);
        let ph = ((n * 7 + (d + 1) * 3) % 10) / 10; // fase fixa: o mesmo arquivo toda vez
        voice(at, dur + release, (t, i) => {
          const abs = at + t;
          if (i % 64 === 0) lp.set(cutoff(abs));
          ph += f / SR;
          const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
          return lp(saw(ph)) * env * (side ? duck(abs) : 1);
        }, { gain: gain / 3, pan: d * width * 0.6 + (k % 2 ? 0.1 : -0.1), send: 0.25 });
      });
    });
  }

  /** Baixo: serra num passa-baixa com envelope curto, em semicolcheias, com sidechain. */
  function bass(at, note, { gain = 0.12, len = 0.11, cutoff = 600 } = {}) {
    const f = midi(note);
    const lp = biquad("lp", cutoff, 1.4);
    let ph = 0;
    voice(at, len + 0.05, (t, i) => {
      if (i % 32 === 0) lp.set(cutoff * (0.5 + 1.5 * Math.exp(-t / 0.04)));
      ph += f / SR;
      const sub = Math.sin(2 * Math.PI * ph) * 0.8;
      return (lp(saw(ph)) * 0.6 + sub) * decay(t, 0.002, len * 0.6) * duck(at + t, 0.5, 0.09);
    }, { gain });
  }

  /** Arpejo de onda quadrada (pulso de 25%), com eco de colcheia pontuada. */
  function arp(at, note, { gain = 0.03, pan = 0, cutoff = 3500, echo = 0.375 } = {}) {
    const f = midi(note);
    const one = (start, g, p) => {
      const lp = biquad("lp", cutoff, 1.2);
      let ph = 0;
      voice(start, 0.3, (t) => {
        ph += f / SR;
        const pulse = ph - Math.floor(ph) < 0.25 ? 1 : -0.33;
        return lp(pulse) * decay(t, 0.002, 0.06);
      }, { gain: g, pan: p, send: 0.2 });
    };
    one(at, gain, pan);
    if (echo) one(at + echo, gain * 0.38, -pan);
  }

  /** Pad digital: serras bem filtradas, ataque lento. */
  function pad(at, dur, notes, { gain = 0.02, cutoff = 900 } = {}) {
    stack(at, dur, notes, { gain, cutoff: () => cutoff, attack: 0.6, release: 0.8, side: false, width: 1 });
  }

  /* ---------- transições ---------- */

  function riser(at, dur, gain = 0.07) {
    const bp = biquad("bp", 400, 1.5);
    let ph = 0;
    voice(at, dur, (t, i) => {
      const k = t / dur;
      if (i % 32 === 0) bp.set(400 * Math.pow(25, k));
      ph += (110 * Math.pow(8, k)) / SR;
      return (bp(noise()) * 1.4 + saw(ph) * 0.15) * Math.pow(k, 2);
    }, { gain, send: 0.3 });
  }

  function downer(at, dur, gain = 0.05) {
    const bp = biquad("bp", 6000, 1.2);
    voice(at, dur, (t, i) => {
      const k = t / dur;
      if (i % 32 === 0) bp.set(6000 * Math.pow(0.06, k));
      return bp(noise()) * 1.6 * Math.pow(1 - k, 1.5);
    }, { gain, send: 0.25 });
  }

  /** Impacto: grave longo, um estouro de ruído agudo e cauda de reverb. */
  function impact(at, gain = 0.4) {
    let ph = 0;
    const hp = biquad("hp", 3000);
    voice(at, 2.2, (t) => {
      ph += (32 + 70 * Math.exp(-t / 0.06)) / SR;
      return Math.sin(2 * Math.PI * ph) * decay(t, 0.003, 0.7) + hp(noise()) * decay(t, 0.001, 0.12) * 0.6;
    }, { gain, send: 0.35 });
  }

  /** A fita parando: o acorde cai de tom até sumir, com o filtro fechando. */
  function tapeStop(at, notes, dur = 0.7, gain = 0.06) {
    notes.forEach((n, k) => {
      const f = midi(n);
      const lp = biquad("lp", 3000);
      let ph = 0;
      voice(at, dur, (t, i) => {
        const r = Math.pow(Math.max(0, 1 - t / dur), 1.6);
        if (i % 32 === 0) lp.set(300 + 2700 * r);
        ph += (f * r) / SR;
        return lp(saw(ph)) * r;
      }, { gain: gain / notes.length, pan: k % 2 ? 0.3 : -0.3, send: 0.15 });
    });
  }

  /** Glitch: três rajadas curtíssimas de ruído "esmagado" (bitcrush). */
  function glitch(at, gain = 0.05, pan = 0) {
    [0, 0.035, 0.06].forEach((o, j) => {
      let hold = 0;
      voice(at + o, 0.025, (t, i) => {
        if (i % (12 + j * 10) === 0) hold = Math.round(noise() * 4) / 4;
        return hold * decay(t, 0.0005, 0.012);
      }, { gain: gain * (1 - j * 0.25), pan: pan + (j - 1) * 0.3 });
    });
  }

  /* ---------- toques da interface ---------- */

  /** Ping digital: senoide com um toque de FM e um clique no ataque. */
  function ping(at, freq, { gain = 0.05, pan = 0, d = 0.08 } = {}) {
    voice(at, d * 6, (t) => {
      const fm = Math.sin(2 * Math.PI * freq * 2 * t) * 0.6 * Math.exp(-t / 0.02);
      return Math.sin(2 * Math.PI * freq * t + fm) * decay(t, 0.001, d) + (t < 0.002 ? noise() * 0.3 : 0);
    }, { gain, pan, send: 0.2 });
  }

  /** O "pronto": dois pings subindo uma quinta. */
  function success(at, { gain = 0.05, pan = 0, base = 1318.5 } = {}) {
    ping(at, base, { gain, pan, d: 0.06 });
    ping(at + 0.07, base * 1.5, { gain: gain * 0.9, pan, d: 0.12 });
  }

  /** Chirp de dados: uma varredura rápida de frequência. */
  function chirp(at, f0, f1, { dur = 0.12, gain = 0.035, pan = 0 } = {}) {
    let ph = 0;
    voice(at, dur, (t) => {
      ph += (f0 * Math.pow(f1 / f0, t / dur)) / SR;
      return Math.sin(2 * Math.PI * ph) * Math.sin((Math.PI * t) / dur);
    }, { gain, pan, send: 0.15 });
  }

  /** Clique de interface: digital, seco. */
  function uiClick(at, { gain = 0.09, pan = 0 } = {}) {
    const hp = biquad("hp", 2500);
    voice(at, 0.03, (t) => hp(noise()) * decay(t, 0.0002, 0.003) * 1.4 + Math.sin(2 * Math.PI * 2600 * t) * decay(t, 0.0003, 0.006), { gain, pan, send: 0.05 });
  }

  /** Tique de dados: um bipe curtíssimo de onda quadrada. */
  function blipTick(at, freq = 3600, { gain = 0.025, pan = 0 } = {}) {
    voice(at, 0.02, (t) => Math.sign(Math.sin(2 * Math.PI * freq * t)) * decay(t, 0.0003, 0.004), { gain, pan });
  }

  /** Swoosh digital: ruído filtrado que atravessa o estéreo, com uma serra por baixo. */
  function swoosh(at, dur = 0.4, { gain = 0.05, up = true } = {}) {
    const bp = biquad("bp", 1000, 1.4);
    let ph = 0;
    voice(at, dur, (t, i) => {
      const k = t / dur;
      if (i % 32 === 0) bp.set(up ? 700 * Math.pow(9, k) : 6000 * Math.pow(0.12, k));
      ph += (up ? 200 + 600 * k : 800 - 600 * k) / SR;
      return (bp(noise()) * 1.4 + saw(ph) * 0.08) * Math.sin(Math.PI * k) ** 1.3;
    }, { gain, pan: 0, send: 0.25 });
  }

  /** Fluxo de dados: bipes curtos em alturas da escala, no ritmo `rate` por segundo. */
  function dataStream(at, dur, { rate = 16, gain = 0.022, scale = [69, 72, 76, 79, 81, 84, 88] } = {}) {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let t = 0; t < dur; t += 1 / rate) {
      const n = scale[Math.floor(rnd() * scale.length)];
      ping(at + t, midi(n + 12), { gain: gain * (0.6 + 0.4 * rnd()), pan: rnd() - 0.5, d: 0.025 });
    }
  }

  return { kicks, markKick, kick, hat, clap, perc, stack, bass, arp, pad, riser, downer, impact, tapeStop, glitch, ping, success, chirp, uiClick, blipTick, swoosh, dataStream, duck };
}
