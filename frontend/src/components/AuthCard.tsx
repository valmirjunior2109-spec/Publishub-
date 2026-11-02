"use client";

import type { PointerEvent, ReactNode } from "react";

/** Cartão de entrar / criar conta: um brilho azul atrás, uma luz que dá duas voltas pela borda (com um halo desfocado) e um holofote que segue o mouse (globals.css). */
export function AuthCard({ children }: { children: ReactNode }) {
  function follow(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
  }

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div aria-hidden="true" className="auth-glow" />
      <div aria-hidden="true" className="auth-halo" />
      <div
        onPointerMove={follow}
        className="auth-card relative z-[1] flex flex-col gap-5 rounded-2xl border border-line p-5 sm:p-8 [&_button]:h-11 [&_button]:text-[15px] [&_input]:h-11 [&_input]:px-3.5 [&_input]:text-[15px]"
      >
        {children}
      </div>
    </div>
  );
}
