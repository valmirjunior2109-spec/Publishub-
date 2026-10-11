import { Easing, interpolate } from "remotion";

/* As curvas do site (globals.css): saída suave para o que entra, ida e volta para câmera. */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 0.75, 0.06);

/** 0 → 1 entre os quadros `from` e `from + dur`, com a curva dada. */
export function progress(frame: number, from: number, dur: number, easing = easeOut): number {
  return interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Mapeia um valor entre dois pontos com clamp. */
export function tween(frame: number, range: [number, number], out: [number, number], easing = easeOut): number {
  return interpolate(frame, range, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
