import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

/* Botão do design system: cantos de 10 px, peso semibold, sem caixa alta.
   O primário é o rosa da marca; o secundário é neutro, com borda fina.
   Só cor muda no hover: nada pula, nada brilha. */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold tracking-[-0.01em] " +
  "transition-[background-color,border-color,color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "border-line bg-paper-raised text-ink hover:border-[rgba(var(--ink-rgb),0.2)] hover:bg-surface",
  ghost: "border-transparent bg-transparent text-ink-muted hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13.5px]",
  md: "h-11 px-5 text-[15px]",
};

/** Classes do botão para usar em <Link> e outros elementos que não são <button>. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
