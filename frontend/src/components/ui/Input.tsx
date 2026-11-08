import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Campo com borda de 4.8:1 (WCAG 1.4.11) e borda vermelha quando aria-invalid. O rótulo é sempre um <label> de quem usa. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-md border border-line-strong bg-card px-3 text-base text-ink placeholder:text-muted",
        "aria-[invalid=true]:border-critical aria-[invalid=true]:border-2",
        "disabled:cursor-not-allowed disabled:bg-surface",
        className,
      )}
      {...props}
    />
  );
});
