import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * A assinatura da marca: a caneta azul do editor escrevendo em cima do vídeo.
 * Tudo aqui é desenho (aria-hidden) ou texto que já faz sentido sozinho, então
 * nenhuma anotação esconde informação de quem usa leitor de tela.
 */

/** Um círculo feito à caneta em volta do conteúdo. Ele se desenha quando aparece (globals.css, .pen-draw). */
export function PenCircle({ children, className, strokeWidth = 4 }: { children: ReactNode; className?: string; strokeWidth?: number }) {
  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <svg aria-hidden="true" viewBox="0 0 400 140" preserveAspectRatio="none" className="pointer-events-none absolute -left-[9%] -top-[22%] h-[144%] w-[118%] overflow-visible text-accent">
        <path
          className="pen-draw"
          pathLength={1}
          d="M30 78 C 30 20, 360 10, 378 64 C 392 112, 120 132, 40 104 C 6 92, 18 52, 70 34"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/** Um sublinhado à caneta, levemente ondulado. */
export function PenUnderline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <svg aria-hidden="true" viewBox="0 0 300 20" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.28em] left-0 h-[0.4em] w-full overflow-visible text-accent">
        <path className="pen-draw" pathLength={1} d="M4 12 C 60 4, 120 18, 180 9 S 270 6, 296 11" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/** Uma nota escrita à mão pela caneta, um pouco torta. */
export function HandNote({ children, className, as: Tag = "span" }: { children: ReactNode; className?: string; as?: "span" | "p" }) {
  return <Tag className={cn("inline-block -rotate-2 font-hand font-semibold leading-[1.05] text-accent", className)}>{children}</Tag>;
}

/** O post-it amarelo colado na página. */
export function PostIt({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rotate-2 rounded-[4px] bg-marker p-4 text-ink shadow-[3px_4px_0_rgba(var(--shadow-rgb),0.18)]", className)}>{children}</div>;
}

/** Um quadradinho de checklist marcado à caneta. */
export function PenCheck({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={cn("shrink-0 overflow-visible text-accent", className)}>
      <rect x="3" y="4" width="24" height="24" rx="5" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <path className="pen-draw" pathLength={1} d="M8 16 L14 23 L30 2" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
