"use client";

import { useEffect, useState } from "react";

/* Ritmo da digitação, em milissegundos. Apagar é mais rápido do que escrever,
   como quando alguém segura o backspace. */
const TYPE_MS = 45;
const DELETE_MS = 22;
const HOLD_MS = 1900; // a frase inteira fica parada, dando tempo de ler
const EMPTY_MS = 340; // um respiro antes da próxima

interface TypingPlaceholderProps {
  /** As frases que se revezam. A primeira é o que o servidor desenha. */
  phrases: string[];
  /** false congela tudo: o campo ganhou foco ou já tem texto. */
  active: boolean;
  className?: string;
}

const quieto = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Um exemplo que se escreve sozinho no lugar do placeholder, com cursor piscando.
 *
 * Some no instante em que a pessoa toca no campo: exemplo é sugestão, não pode
 * disputar espaço com quem está escrevendo. Quem pede menos movimento no sistema
 * vê só a primeira frase, parada.
 */
export function TypingPlaceholder({ phrases, active, className }: TypingPlaceholderProps) {
  // o primeiro render (servidor e navegador) mostra a frase inteira: nada pisca
  const [state, setState] = useState({ index: 0, length: phrases[0]?.length ?? 0, deleting: false });

  const phrase = phrases[state.index % phrases.length] ?? "";

  useEffect(() => {
    if (!active || phrases.length === 0 || quieto()) return;

    const { length, deleting } = state;
    const completa = length >= phrase.length;
    // aba escondida: o navegador já segura os timers, mas nem avançamos a animação
    const espera = document.hidden ? 1000 : deleting ? (length > 0 ? DELETE_MS : EMPTY_MS) : completa ? HOLD_MS : TYPE_MS + Math.random() * 25;

    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setState((atual) => ({ ...atual }));
        return;
      }
      setState((atual) => {
        if (atual.deleting) {
          return atual.length > 0
            ? { ...atual, length: atual.length - 1 }
            : { index: (atual.index + 1) % phrases.length, length: 0, deleting: false };
        }
        const alvo = phrases[atual.index % phrases.length] ?? "";
        return atual.length >= alvo.length ? { ...atual, deleting: true } : { ...atual, length: atual.length + 1 };
      });
    }, espera);

    return () => window.clearTimeout(timer);
  }, [state, active, phrase, phrases]);

  if (!active) return null;

  return (
    <span aria-hidden="true" className={className}>
      {phrase.slice(0, state.length)}
      <span className="typing-caret" />
    </span>
  );
}
