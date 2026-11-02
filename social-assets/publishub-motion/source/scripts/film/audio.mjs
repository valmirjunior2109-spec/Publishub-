// A mixagem dos filmes, a partir de gravações de verdade (scripts/film/get-audio.mjs): a música nos compassos que encaixam nas
// cenas, os cliques, as passagens e o teclado dos cartões, tudo em tempos da música.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const AUDIO = join(here, "../../public/film/audio");
const SR = 48000;

function readWav(name) {
  const b = readFileSync(join(AUDIO, `${name}.wav`));
  let o = 12;
  while (b.toString("ascii", o, o + 4) !== "data") o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 4;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = b.readInt16LE(o + 8 + i * 4) / 32768;
    R[i] = b.readInt16LE(o + 10 + i * 4) / 32768;
  }
  return { L, R, n };
}

/** Toca `src` a partir de `from` (s), por `dur` (s), em `at` (s), com fades curtos nas pontas para não estalar. */
function place(busL, busR, length, src, at, from, dur, { gain = 1, rate = 1, fade = 0.006 } = {}) {
  const start = Math.round(at * SR);
  const n = Math.round(dur * SR);
  const f = Math.max(1, Math.round(fade * SR));
  for (let i = 0; i < n && start + i < length; i++) {
    if (start + i < 0) continue;
    const pos = from * SR + i * rate;
    const k = Math.floor(pos);
    if (k + 1 >= src.n) break;
    const t = pos - k;
    const env = Math.min(1, i / f, (n - i) / f);
    busL[start + i] += (src.L[k] + (src.L[k + 1] - src.L[k]) * t) * env * gain;
    busR[start + i] += (src.R[k] + (src.R[k + 1] - src.R[k]) * t) * env * gain;
  }
}

/**
 * `music`: { file, bpm, phase, segments: [[compasso inicial, final], …] }. `bpm` é o do filme: se a música for outra, ela acompanha.
 * `clicks`, `shots` em tempos da música; `typed`: [[tempo, duração em tempos], …]; `out`: o caminho do WAV.
 */
export function mixdown({ seconds, bpm, music, clicks, shots, typed, out }) {
  const length = Math.ceil(seconds * SR);
  const beat = 60 / bpm;
  const musicL = new Float32Array(length);
  const musicR = new Float32Array(length);
  const track = readWav(music.file);
  const rate = music.bpm === bpm ? 1 : bpm / music.bpm;
  const bar = (60 / music.bpm) * 4;
  let at = 0;
  for (const [a, b] of music.segments) {
    const dur = ((b - a) * bar) / rate;
    place(musicL, musicR, length, track, at, music.phase + a * bar, Math.min(dur, seconds - at), { rate, fade: 0.012 });
    at += dur;
  }

  const fxL = new Float32Array(length);
  const fxR = new Float32Array(length);
  const click = readWav("click");
  const whoosh = readWav("whoosh");
  const typing = readWav("typing");
  // o clique de verdade: apertar e soltar, como foi gravado; cada um varia um pouco de tom, para não soar repetido
  clicks.forEach((b, k) => place(fxL, fxR, length, click, b * beat, 0, 0.24, { gain: 0.95 + (k % 3) * 0.03, rate: 0.98 + (k % 4) * 0.012 }));
  // a passagem, baixa, em cada entrada de tela
  for (const b of shots) place(fxL, fxR, length, whoosh, b * beat - 0.1, 0, 0.7, { gain: 0.16, fade: 0.03 });
  // o teclado por baixo do que é digitado, de um trecho diferente da gravação a cada vez
  typed.forEach(([b, beats], k) => place(fxL, fxR, length, typing, b * beat, 2 + k * 1.4, beats * beat + 0.05, { gain: 0.34, fade: 0.012 }));

  const L = new Float32Array(length);
  const R = new Float32Array(length);
  const MUSIC = 0.5;
  // a música abre espaço no instante do clique, e volta em seguida
  const duck = new Float32Array(length).fill(1);
  for (const b of clicks) {
    const c = Math.round(b * beat * SR);
    for (let i = -480; i < 14400; i++) {
      if (c + i < 0 || c + i >= length) continue;
      const k = i < 0 ? -i / 480 : Math.min(1, i / 14400);
      duck[c + i] = Math.min(duck[c + i], 1 - 0.5 * (1 - k));
    }
  }
  for (let i = 0; i < length; i++) {
    L[i] = musicL[i] * MUSIC * duck[i] + fxL[i];
    R[i] = musicR[i] * MUSIC * duck[i] + fxR[i];
  }
  // o fim: sem estalo se a música ainda soar
  for (let i = 0; i < SR; i++) {
    const g = i / SR;
    L[length - 1 - i] *= g;
    R[length - 1 - i] *= g;
  }

  // o volume: cerca de -14 dB de RMS com janela ativa, e um limitador suave para os picos
  let sum = 0, count = 0;
  for (let i = 0; i < length; i += 4800) {
    let s = 0;
    for (let j = 0; j < 4800 && i + j < length; j++) s += L[i + j] ** 2 + R[i + j] ** 2;
    const r = s / 9600;
    if (r > 1e-4) { sum += r; count++; }
  }
  const gain = 10 ** (-14 / 20) / Math.sqrt(sum / count);
  const limit = (v) => { const a = Math.abs(v); return a <= 0.7 ? v : Math.sign(v) * (0.7 + 0.27 * Math.tanh((a - 0.7) / 0.27)); };

  const buf = Buffer.alloc(44 + length * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + length * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(length * 4, 40);
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const a = limit(L[i] * gain);
    const b = limit(R[i] * gain);
    peak = Math.max(peak, Math.abs(a), Math.abs(b));
    buf.writeInt16LE(Math.round(a * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(b * 32767), 46 + i * 4);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log("✓", out.split(/[\\/]/).pop(), seconds.toFixed(2) + "s", "ganho", gain.toFixed(2), "pico", peak.toFixed(2));
}
