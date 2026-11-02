// Publishub · motion ad: o motor da trilha. Instrumentos sintetizados do zero
// (nenhuma amostra, nenhuma música de terceiros), um reverb Schroeder e o master.
// Cada partitura (make-sound.mjs, make-sound-v2.mjs) cria um mixer, toca e grava.

import { writeFileSync } from "node:fs";

/** Um mixer de `T.durationInFrames / T.fps` segundos, a 48 kHz, estéreo. */
export function createMixer(T) {
  const SR = 48000;
  const LEN = Math.round((T.durationInFrames / T.fps) * SR);
  const L = new Float32Array(LEN);
  const R = new Float32Array(LEN);
  const sendL = new Float32Array(LEN); // o que vai para o reverb
  const sendR = new Float32Array(LEN);

  const sec = (frame) => frame / T.fps;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ruído determinístico: o mesmo arquivo toda vez
  let seed = 1234567;
  const noise = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };

  /** Escreve uma voz: `fn(t)` devolve a amostra; `pan` −1…1; `send` vai para o reverb. */
  function voice(start, dur, fn, { gain = 1, pan = 0, send = 0 } = {}) {
    const s0 = Math.max(0, Math.round(start * SR));
    const s1 = Math.min(LEN, Math.round((start + dur) * SR));
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = s0; i < s1; i++) {
      const v = fn((i - s0) / SR, i - s0);
      L[i] += v * gl;
      R[i] += v * gr;
      if (send) {
        sendL[i] += v * gl * send;
        sendR[i] += v * gr * send;
      }
    }
  }

  /** Biquad (RBJ). Devolve uma função que filtra amostra a amostra; `set` troca a frequência. */
  function biquad(type, freq, q = 0.707) {
    let b0, b1, b2, a1, a2;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const set = (f) => {
      const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
      const cos = Math.cos(w);
      const alpha = Math.sin(w) / (2 * q);
      let n0, n1, n2;
      if (type === "lp") [n0, n1, n2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      else if (type === "hp") [n0, n1, n2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      else [n0, n1, n2] = [alpha, 0, -alpha]; // bp
      const a0 = 1 + alpha;
      b0 = n0 / a0; b1 = n1 / a0; b2 = n2 / a0;
      a1 = (-2 * cos) / a0; a2 = (1 - alpha) / a0;
    };
    set(freq);
    const run = (x) => {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    };
    run.set = set;
    return run;
  }

  const decay = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

  /* ---------- os instrumentos ---------- */

  function kick(at, { gain = 0.9, f0 = 120, f1 = 42, len = 0.45, d = 0.16 } = {}) {
    let ph = 0;
    voice(at, len, (t) => {
      const f = f1 + (f0 - f1) * Math.exp(-t / 0.035);
      ph += (2 * Math.PI * f) / SR;
      return Math.sin(ph) * decay(t, 0.002, d) + (t < 0.004 ? noise() * 0.3 * (1 - t / 0.004) : 0);
    }, { gain });
  }

  function boom(at, gain = 0.9) {
    let ph = 0;
    const lp = biquad("lp", 180);
    voice(at, 2.2, (t) => {
      const f = 34 + 40 * Math.exp(-t / 0.08);
      ph += (2 * Math.PI * f) / SR;
      return Math.sin(ph) * decay(t, 0.004, 0.7) + lp(noise()) * decay(t, 0.002, 0.25) * 1.6;
    }, { gain, send: 0.25 });
  }

  /** O corte da lâmina: um estalo metálico curto. */
  function snip(at, pan = 0, gain = 0.32) {
    const bp = biquad("bp", 5200, 2.2);
    voice(at, 0.09, (t) => {
      const s = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t / 0.012);
      return bp(noise()) * 2.4 * decay(t, 0.0008, 0.018) + s * 0.35;
    }, { gain, pan, send: 0.12 });
  }

  function tick(at, { freq = 2600, gain = 0.12, pan = 0, d = 0.012 } = {}) {
    const hp = biquad("hp", 3000);
    voice(at, 0.06, (t) => hp(noise()) * decay(t, 0.0005, d * 0.6) * 0.7 + Math.sin(2 * Math.PI * freq * t) * decay(t, 0.0005, d), { gain, pan, send: 0.08 });
  }

  function whoosh(at, dur, from, to, gain = 0.22, pan = 0) {
    const bp = biquad("bp", from, 1.1);
    voice(at, dur, (t, i) => {
      if (i % 32 === 0) bp.set(from * Math.pow(to / from, t / dur));
      const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.6;
      return bp(noise()) * env * 2.2;
    }, { gain, pan, send: 0.3 });
  }

  function riser(at, dur, gain = 0.3) {
    const lp = biquad("lp", 300, 1.4);
    let ph = 0;
    voice(at, dur, (t, i) => {
      const k = t / dur;
      if (i % 32 === 0) lp.set(300 * Math.pow(30, k));
      const f = 160 * Math.pow(5, k);
      ph += (2 * Math.PI * f) / SR;
      return (lp(noise()) * 1.2 + Math.sin(ph) * 0.25) * Math.pow(k, 2.2);
    }, { gain, send: 0.2 });
  }

  /** Sino suave: parciais inarmônicas com decaimento longo. */
  function bell(at, note, { gain = 0.16, pan = 0, d = 1.2 } = {}) {
    const f = midi(note);
    const parts = [[1, 1], [2.0, 0.42], [2.76, 0.22], [4.07, 0.12], [5.4, 0.05]];
    voice(at, d * 4, (t) => parts.reduce((a, [m, g], j) => a + Math.sin(2 * Math.PI * f * m * t) * g * Math.exp(-t / (d / (1 + j * 0.6))), 0) * decay(t, 0.003, 10), { gain, pan, send: 0.45 });
  }

  /** Blip de interface: um senoide curto com ataque macio. */
  function blip(at, note, { gain = 0.13, pan = 0, d = 0.09 } = {}) {
    const f = midi(note);
    voice(at, 0.5, (t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * decay(t, 0.004, d), { gain, pan, send: 0.3 });
  }

  /** Pad: harmônicos somados, levemente desafinados, ataque e soltura lentos. */
  function pad(at, dur, notes, { gain = 0.05, attack = 0.35, release = 0.5 } = {}) {
    notes.forEach((n, k) => {
      [-1, 1].forEach((side) => {
        const f = midi(n) * (1 + side * 0.0025);
        voice(at, dur + release, (t) => {
          let v = 0;
          for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * t + h * k) / (h * h * 0.8);
          const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
          return v * env;
        }, { gain, pan: side * 0.45, send: 0.35 });
      });
    });
  }

  function hat(at, gain = 0.05, pan = 0.2) {
    const hp = biquad("hp", 7000);
    voice(at, 0.05, (t) => hp(noise()) * decay(t, 0.0005, 0.012), { gain, pan });
  }


  /** Chiado de frigideira: ruído filtrado com estalos aleatórios. */
  function sizzle(at, dur, gain = 0.12) {
    const hp = biquad("hp", 2500);
    const bp = biquad("bp", 6000, 0.8);
    voice(at, dur, (t) => {
      const env = Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.3);
      const crackle = noise() > 0.985 ? noise() * 3 : 0;
      return (bp(hp(noise())) * 1.4 + crackle * 0.5) * env;
    }, { gain, pan: 0.15, send: 0.15 });
  }

  /** Clique de mouse: o estalo do botão descendo e, 85 ms depois, o da volta (mais leve e agudo). */
  function click(at, { gain = 0.5, pan = 0 } = {}) {
    const press = (t0, g, f) => {
      const bp = biquad("bp", f, 1.8);
      voice(t0, 0.05, (t) => bp(noise()) * decay(t, 0.0003, 0.0035) * 3 + Math.sin(2 * Math.PI * f * 0.5 * t) * decay(t, 0.0003, 0.004) * 0.6 + Math.sin(2 * Math.PI * 180 * t) * decay(t, 0.0005, 0.008) * 0.5, { gain: g, pan, send: 0.05 });
    };
    press(at, gain, 3400);
    press(at + 0.085, gain * 0.6, 4200);
  }

  /** O marca-texto passando no papel: ruído agudo e curto, com um arco de volume. */
  function swipe(at, { gain = 0.06, pan = 0, dur = 0.16 } = {}) {
    const hp = biquad("hp", 2500);
    const bp = biquad("bp", 4500, 0.9);
    voice(at, dur, (t) => bp(hp(noise())) * Math.sin((Math.PI * t) / dur) ** 1.2 * 2, { gain, pan, send: 0.1 });
  }

  /** Uma tecla: tique seco com altura levemente variável. */
  function key(at, { gain = 0.05, pan = 0 } = {}) {
    tick(at, { freq: 1400 + (noise() + 1) * 500, gain, pan, d: 0.006 });
  }

  function render(target) {


    function reverb(input, delays, mix) {
      const out = new Float32Array(LEN);
      const combs = delays.map((d) => ({ buf: new Float32Array(Math.round(d * SR)), i: 0, lp: 0 }));
      for (let n = 0; n < LEN; n++) {
        let acc = 0;
        for (const c of combs) {
          const y = c.buf[c.i];
          c.lp = y * 0.6 + c.lp * 0.4; // amortece os agudos da cauda
          c.buf[c.i] = input[n] + c.lp * 0.78;
          c.i = (c.i + 1) % c.buf.length;
          acc += y;
        }
        out[n] = acc / combs.length;
      }
      // dois allpass para espalhar
      for (const d of [0.0051, 0.0017]) {
        const buf = new Float32Array(Math.round(d * SR));
        let i = 0;
        for (let n = 0; n < LEN; n++) {
          const b = buf[i];
          const y = -out[n] + b;
          buf[i] = out[n] + b * 0.5;
          i = (i + 1) % buf.length;
          out[n] = y;
        }
      }
      for (let n = 0; n < LEN; n++) out[n] *= mix;
      return out;
    }

    const wetL = reverb(sendL, [0.0297, 0.0371, 0.0411, 0.0437], 0.9);
    const wetR = reverb(sendR, [0.0311, 0.0353, 0.0423, 0.0459], 0.9);

    /* ---------- master: soma, saturação suave, normalização, fades ---------- */

    let peak = 0;
    const outL = new Float32Array(LEN);
    const outR = new Float32Array(LEN);
    for (let n = 0; n < LEN; n++) {
      outL[n] = Math.tanh((L[n] + wetL[n]) * 1.1);
      outR[n] = Math.tanh((R[n] + wetR[n]) * 1.1);
      peak = Math.max(peak, Math.abs(outL[n]), Math.abs(outR[n]));
    }
    const norm = 0.89 / peak; // −1 dBFS
    const fadeIn = Math.round(0.004 * SR);
    const fadeOut = Math.round(0.6 * SR);
    const pcm = Buffer.alloc(44 + LEN * 4);
    pcm.write("RIFF", 0);
    pcm.writeUInt32LE(36 + LEN * 4, 4);
    pcm.write("WAVE", 8);
    pcm.write("fmt ", 12);
    pcm.writeUInt32LE(16, 16);
    pcm.writeUInt16LE(1, 20);
    pcm.writeUInt16LE(2, 22);
    pcm.writeUInt32LE(SR, 24);
    pcm.writeUInt32LE(SR * 4, 28);
    pcm.writeUInt16LE(4, 32);
    pcm.writeUInt16LE(16, 34);
    pcm.write("data", 36);
    pcm.writeUInt32LE(LEN * 4, 40);
    for (let n = 0; n < LEN; n++) {
      const g = norm * Math.min(1, n / fadeIn) * Math.min(1, (LEN - n) / fadeOut);
      pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[n] * g)) * 32767), 44 + n * 4);
      pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[n] * g)) * 32767), 46 + n * 4);
    }
    writeFileSync(target, pcm);
    console.log(`✓ ${target}  ${(LEN / SR).toFixed(2)} s · ${SR} Hz · estéreo · pico normalizado a −1 dBFS`);

  }

  // as peças básicas também, para quem quiser timbres próprios (a trilha lofi da demo)
  return { sec, midi, kick, boom, snip, tick, whoosh, riser, bell, blip, pad, hat, sizzle, click, swipe, key, render, voice, biquad, noise, decay, SR, LEN };
}
