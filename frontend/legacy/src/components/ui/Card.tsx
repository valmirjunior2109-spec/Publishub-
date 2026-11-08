import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Sem padding interno, para conteúdo que encosta na borda (ex.: gráfico). */
  flush?: boolean;
}

/** Superfície: borda de 1 px no lugar de sombra, raio de 14 px, padding de 16 / 20 px. */
export function Card({ flush = false, className, ...props }: CardProps) {
  return <div className={cn("rounded-xl border border-line bg-paper-raised", !flush && "p-4 sm:p-5", className)} {...props} />;
}
