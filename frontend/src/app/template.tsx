import type { ReactNode } from "react";

/** Remontado a cada navegação: é o que faz cada página entrar com o leve deslize. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
