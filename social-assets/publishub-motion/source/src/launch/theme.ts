// O filme de lançamento "AI builds faster. Publishub makes sure it works." — tokens, curvas e tempo.
// As cores são as de frontend/src/app/globals.css (a paleta oficial da marca): Midnight, Pixel Cream, Electric Purple.
// Os tempos vêm de timeline.json, o mesmo arquivo que a trilha (scripts/launch/score.py) lê.

import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import T from "./timeline.json";

export const C = {
  bg: "#0D0B12", // Midnight
  bg2: "#100D17",
  surface: "#120F19",
  card: "#17131F",
  elevated: "#211A2B",
  line: "#342943",
  lineStrong: "#857799",
  ink: "#F2D7A0", // Pixel Cream
  white: "#FBF5E9",
  muted: "#AAA1B5",
  dim: "#6E6480",
  accent: "#A875FF",
  action: "#9147FF", // Electric Purple
  lavender: "#C18AFF",
  pixelShadow: "#4A2386",
  success: "#57D98C",
  successSoft: "#10241A",
  critical: "#FF6B75",
  criticalSoft: "#2A1218",
  warn: "#FFBF69",
  // a loja de exemplo (fictícia) dentro do navegador: tema claro, para contrastar com a Publishub
  store: { bg: "#FFFFFF", ink: "#141218", muted: "#6B6675", line: "#E7E3EC", soft: "#F6F4F8", btn: "#141218" },
} as const;

export const SANS = "Geist, system-ui, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, monospace";
export const PIXEL = "'Pixelify Sans', 'Geist Mono', monospace";

export const FPS = T.fps;
export const FRAMES = Math.round(T.seconds * T.fps);
export const SCENES = T.scenes as Record<keyof typeof T.scenes, [number, number]>;
export const CUE = T.cues;
export const VO = T.vo;

// arranca rápido e assenta longo, sem quicar (Linear, Vercel)
export const settle = Easing.bezier(0.16, 1, 0.3, 1);
export const glide = Easing.bezier(0.65, 0, 0.35, 1);
export const accel = Easing.bezier(0.55, 0, 0.9, 0.3);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 entre `at` e `at + dur` segundos. */
export const p = (t: number, at: number, dur: number, easing: (n: number) => number = settle) =>
  dur <= 0 ? (t >= at ? 1 : 0) : interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing });
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const range = (t: number, a: number, b: number) => t >= a && t < b;

/** O tempo em segundos e o formato do quadro. */
export function useStage() {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const v = height > width;
  return { t: frame / fps, frame, width, height, v, fps };
}

/** Entrada padrão: sobe 24px e aparece, com um desfoque curto. */
export function enter(t: number, at: number, dur = 0.6, dist = 24) {
  const k = p(t, at, dur);
  return { opacity: k, transform: `translateY(${(1 - k) * dist}px)`, filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined } as const;
}

/** Digitação: quantos caracteres já apareceram. */
export const typed = (t: number, at: number, text: string, cps = 38) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));
