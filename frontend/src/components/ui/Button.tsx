import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

/* Botão de produto: cantos arredondados, peso semibold, sem caixa alta. O
   primário ganha o brilho verde da marca e sobe um pixel ao passar o mouse. */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold tracking-[-0.005em] " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-paper-raised shadow-glow hover:-translate-y-px hover:border-accent-strong hover:bg-accent-strong",
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
