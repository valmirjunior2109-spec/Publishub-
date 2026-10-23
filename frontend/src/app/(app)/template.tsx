import type { ReactNode } from "react";

/**
 * O template da raiz é remontado quando o primeiro segmento muda; aqui dentro o
 * primeiro segmento é sempre o grupo (app), então ele fica parado e a moldura
 * também. Este é o que dá o leve deslize a cada página da área logada, só no
 * conteúdo, sem refazer o painel.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
