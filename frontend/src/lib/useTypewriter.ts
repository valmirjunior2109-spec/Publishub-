"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  /** ms por caractere ao digitar; um pouco de variação evita o ritmo de máquina */
  typeMs?: number;
  deleteMs?: number;
  /** pausa com a frase inteira na tela, e depois de apagá-la */
  holdMs?: number;
  gapMs?: number;
}

/**
 * Escreve e apaga uma lista de frases, em laço: pausa → apaga → digita a próxima.
 * Começa já com a primeira frase escrita, então não há piscada na entrada, e mantém
 * um único timer por passo, sempre limpo ao desmontar. Com "reduzir movimento" o
 * texto fica parado na primeira frase (o cursor para pelo CSS).
 */
export function useTypewriter(phrases: string[], { typeMs = 55, deleteMs = 28, holdMs = 1700, gapMs = 500 }: Options = {}) {
  const [text, setText] = useState(phrases[0] ?? "");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (phrases.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let phrase = 0;
    let chars = phrases[0].length;
    let deleting = true;

    const step = () => {
      if (cancelled) return;
      const current = phrases[phrase];
      chars += deleting ? -1 : 1;
      setText(current.slice(0, Math.max(0, chars)));

      let delay: number;
      if (!deleting && chars >= current.length) {
        deleting = true;
        delay = holdMs;
      } else if (deleting && chars <= 0) {
        deleting = false;
        phrase = (phrase + 1) % phrases.length;
        delay = gapMs;
      } else {
        delay = deleting ? deleteMs : typeMs + Math.random() * 45;
      }
      timer.current = window.setTimeout(step, delay);
    };

    timer.current = window.setTimeout(step, holdMs);
    return () => {
      cancelled = true;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [phrases, typeMs, deleteMs, holdMs, gapMs]);

  return text;
}
