import type { ReactNode } from "react";

/**
 * Remonta a cada navegação: a página entra em dois "quadros" (globals.css, .page-in).
 * Com "reduzir movimento", aparece direto.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
