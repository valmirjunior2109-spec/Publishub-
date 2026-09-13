import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "ink" | "accent" | "confirmed" | "pending" | "refuted";

/* Do design no Figma: fundo tingido a 10% e borda a 35% da cor do status. */
const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-transparent text-ink-muted",
  ink: "border-ink bg-transparent text-ink",
  accent: "border-[rgba(var(--accent-rgb),0.35)] bg-[rgba(var(--accent-rgb),0.1)] text-accent",
  confirmed: "border-[rgba(79,122,63,0.35)] bg-[rgba(79,122,63,0.1)] text-confirmed",
  pending: "border-[rgba(192,138,46,0.35)] bg-[rgba(192,138,46,0.1)] text-pending",
  refuted: "border-[rgba(138,90,78,0.35)] bg-[rgba(138,90,78,0.1)] text-refuted",
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
        "inline-flex select-none items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[12px] font-medium uppercase leading-[1.4] tracking-[0.06em]",
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
