import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Arrow = "down-left" | "down-right" | "down";

/* As setas são traços de caneta: uma curva só, com a ponta aberta, como quem anota na margem. */
const ARROWS: Record<Arrow, { box: string; line: string; head: string }> = {
  "down-left": { box: "0 0 80 70", line: "M70 6 C 66 34, 48 52, 14 60", head: "M26 50 L 13 60 L 28 66" },
  "down-right": { box: "0 0 80 70", line: "M10 6 C 14 34, 32 52, 66 60", head: "M54 50 L 67 60 L 52 66" },
  down: { box: "0 0 40 70", line: "M22 4 C 14 22, 26 40, 19 64", head: "M11 54 L 19 65 L 27 55" },
};

/**
 * Uma nota à mão do editor, em azul de caneta, com a seta apontando para o que
 * ela comenta. É detalhe: o texto que ela diz também está dito em outro lugar
 * da página, então leitores de tela não perdem nada se a ignorarem.
 */
export function HandNote({ children, arrow = "down-left", className, arrowClassName }: { children: ReactNode; arrow?: Arrow; className?: string; arrowClassName?: string }) {
  const a = ARROWS[arrow];
  return (
    <span aria-hidden="true" className={cn("hand pointer-events-none inline-flex select-none flex-col text-[18px] sm:text-[20px]", className)}>
      <span className="-rotate-3 whitespace-nowrap">{children}</span>
      <svg viewBox={a.box} className={cn("mt-1 h-10 w-auto sm:h-11", arrow === "down-left" ? "self-start" : arrow === "down-right" ? "self-end" : "self-center", arrowClassName)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={a.line} />
        <path d={a.head} />
      </svg>
    </span>
  );
}
