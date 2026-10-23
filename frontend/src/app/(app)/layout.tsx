import type { ReactNode } from "react";
import { AppArea } from "@/components/AppArea";

/**
 * A área logada: painel, análises, nova análise, memória, conta, boas-vindas e o
 * resultado. O grupo (app) não entra no endereço; ele só faz essas páginas
 * dividirem uma moldura que não desmonta ao navegar entre elas (ver AppArea).
 * Cada pasta continua com o próprio layout, que a tira do Google.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppArea>{children}</AppArea>;
}
