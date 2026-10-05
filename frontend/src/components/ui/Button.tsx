import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

/* Botão do caderno: cantos de 14 px, peso bold, sem caixa alta. O primário é a
   tinta azul com a sombra carimbada, que "afunda" ao clicar. */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border font-bold tracking-[-0.015em] " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary: "border-ink bg-accent text-paper-raised shadow-stamp hover:-translate-x-px hover:-translate-y-px hover:bg-accent-strong active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  secondary: "border-line bg-paper-raised text-ink shadow-float hover:border-[rgba(var(--ink-rgb),0.22)] hover:bg-paper",
  ghost: "border-transparent bg-transparent text-ink-muted hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-[7px] text-[13px]",
  md: "px-5 py-2.5 text-[14.5px]",
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
