import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "ink" | "accent" | "confirmed" | "pending" | "refuted";

/* Fundo tingido a 10% e borda a 25% da própria cor do status: um token só por tom. */
const tint = "border-[color-mix(in_srgb,currentColor_25%,transparent)] bg-[color-mix(in_srgb,currentColor_10%,transparent)]";
const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-transparent text-ink-muted",
  ink: "border-ink bg-transparent text-ink",
  accent: cn(tint, "text-accent"),
  confirmed: cn(tint, "text-confirmed"),
  pending: cn(tint, "text-pending"),
  refuted: cn(tint, "text-refuted"),
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Ponto colorido antes do texto (opcional). */
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12px] font-medium leading-[1.4]",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
