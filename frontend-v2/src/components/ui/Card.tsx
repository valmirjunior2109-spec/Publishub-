import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Sem padding interno, para conteúdo que encosta na borda (ex.: gráfico). */
  flush?: boolean;
}

/** Superfície elevada: borda de 1px no lugar de sombra, raio de 8px. */
export function Card({ flush = false, className, ...props }: CardProps) {
  return <div className={cn("rounded-md border border-line bg-paper-raised", !flush && "p-5 sm:p-6", className)} {...props} />;
}
