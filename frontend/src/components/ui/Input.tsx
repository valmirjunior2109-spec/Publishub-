import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-sm border border-line bg-paper-raised px-3 text-sm text-ink placeholder:text-ink-muted",
        "focus:border-ink focus:outline-none aria-[invalid=true]:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
