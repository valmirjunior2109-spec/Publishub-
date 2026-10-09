"use client";

import type { PointerEvent, ReactNode } from "react";

/** Cartão de entrar / criar conta: um brilho azul atrás, uma luz que gira pela borda (com um halo desfocado) e um holofote que segue o mouse (globals.css). */
export function AuthCard({ children }: { children: ReactNode }) {
  function follow(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
  }

  return (
    <div className="relative mx-auto w-full max-w-[680px] lg:mx-0">
      <div aria-hidden="true" className="auth-glow" />
      <div aria-hidden="true" className="auth-halo" />
      <div
        onPointerMove={follow}
        className="auth-card relative z-[1] flex flex-col gap-7 rounded-2xl border border-line p-7 sm:p-12 [&_button]:h-14 [&_button]:text-[17px] [&_input]:h-14 [&_input]:px-4 [&_input]:text-[17px]"
      >
        {children}
      </div>
    </div>
  );
}
