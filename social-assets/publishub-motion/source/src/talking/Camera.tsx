import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, easeOut, mix, progress } from "../anim";
import { FACE, type CamKey } from "./timeline";

interface Shot {
  s: number;
  x: number;
  y: number;
}

const shot = (k: CamKey): Shot => ({ s: k.s, x: k.x ?? 0, y: k.y ?? 0 });

function evalKey(k: CamKey, from: Shot, frame: number): Shot {
  const dur = k.dur ?? 0;
  if (dur <= 0) return shot(k);
  const t = progress(frame, k.at, dur, k.ease === "inOut" ? easeInOut : easeOut);
  const to = shot(k);
  return { s: mix(from.s, to.s, t), x: mix(from.x, to.x, t), y: mix(from.y, to.y, t) };
}

/** Limita o deslocamento para o vídeo sempre cobrir o quadro inteiro (sem borda preta). */
function cover(c: Shot): Shot {
  const k = Math.max(0, c.s - 1);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return { s: c.s, x: clamp(c.x, -(1080 - FACE.x) * k, FACE.x * k), y: clamp(c.y, -(1920 - FACE.y) * k, FACE.y * k) };
}

/** O ponto de partida da chave n (o estado no quadro em que ela começa). */
function evalBase(keys: CamKey[], n: number): Shot {
  let base = shot(keys[0]);
  for (let m = 1; m <= n; m++) base = evalKey(keys[m - 1], base, keys[m].at);
  return base;
}

/**
 * A câmera virtual sobre o vídeo: zoom em torno do rosto e um deslocamento
 * pequeno para reenquadrar. Nada de distorção: só escala uniforme e posição.
 */
export function Camera({ keys, children, frameOverride }: { keys: CamKey[]; children: ReactNode; frameOverride?: number }) {
  const current = useCurrentFrame();
  const frame = frameOverride ?? current;
  let n = -1;
  keys.forEach((k, m) => {
    if (frame >= k.at) n = m;
  });
  const base = n <= 0 ? shot(keys[0]) : evalBase(keys, n);
  const c = cover(n < 0 ? shot(keys[0]) : evalKey(keys[n], base, frame));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${FACE.x}px ${FACE.y}px`,
        transform: `translate(${c.x}px, ${c.y}px) scale(${c.s})`,
      }}
    >
      {children}
    </div>
  );
}
