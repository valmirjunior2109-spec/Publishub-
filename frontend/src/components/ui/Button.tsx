import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

/* Botões com 44 px de altura (alvo de toque confortável), texto de alto contraste
   e o anel de foco global (globals.css). O estado de carregamento não depende só da cor. */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold no-underline transition-[color,background-color,border-color,box-shadow,transform] duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/* o principal é o roxo da marca com a sombra "dura" de pixel: sobe 1px no mouse e afunda no clique */
const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-action text-on-action shadow-pixel hover:bg-action-hover hover:text-on-action hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-reduce:transform-none",
  secondary: "border-line-strong bg-card text-ink hover:border-accent hover:bg-surface hover:text-ink",
  ghost: "border-transparent bg-transparent text-accent hover:bg-accent-soft hover:text-accent-hover",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-12 px-6 text-base",
};

/** Para <a> e <Link> com cara de botão. */
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
