import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

/* Do design no Figma: rótulo em caixa alta, 4px de raio, secundário com borda ink. */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm border font-medium uppercase tracking-[0.04em] " +
  "transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-paper-raised hover:border-accent-strong hover:bg-accent-strong",
  secondary: "border-ink bg-transparent text-ink hover:bg-[rgba(var(--ink-rgb),0.06)]",
  ghost: "border-transparent bg-transparent text-ink-muted hover:border-line hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-[7px] text-[12px]",
  md: "px-5 py-2.5 text-[13px]",
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
