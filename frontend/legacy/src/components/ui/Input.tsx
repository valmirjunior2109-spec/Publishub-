import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Campo do design system: 40 px de altura, raio de 10 px; o foco é a borda azul (globals.css). */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-[14.5px] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted",
        "hover:border-[rgba(var(--ink-rgb),0.2)] aria-[invalid=true]:border-refuted",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
