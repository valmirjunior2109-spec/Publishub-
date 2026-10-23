import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/* Botão do design system: cápsula, peso semibold, sem caixa alta.
   O primário é o azul da caneta; o secundário é neutro, com borda fina.
   No hover a cor muda e o botão sobe 1 px; ao clicar ele volta e encolhe um
   pouco (150 ms). Com "reduzir movimento", só a cor muda (globals.css). */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border font-semibold tracking-[-0.01em] " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-on-accent shadow-[0_1px_2px_rgba(var(--shadow-rgb),0.12)] hover:bg-accent-strong hover:shadow-[0_6px_16px_-8px_rgba(var(--accent-rgb),0.7)]",
  secondary: "border-line bg-paper-raised text-ink hover:border-[rgba(var(--ink-rgb),0.2)] hover:bg-surface",
  ghost: "border-transparent bg-transparent text-ink-muted hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  // a ação principal das páginas públicas
  lg: "h-12 px-6 text-[15px]",
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
