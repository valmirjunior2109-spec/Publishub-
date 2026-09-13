import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "confirmed" | "pending" | "refuted";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-paper text-ink-muted",
  accent: "border-accent bg-accent-soft text-accent",
  confirmed: "border-confirmed text-confirmed",
  pending: "border-pending text-pending",
  refuted: "border-refuted text-refuted",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Ponto colorido antes do texto — usado nos status do loop. */
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]",
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
