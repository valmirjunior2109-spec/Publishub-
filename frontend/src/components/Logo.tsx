import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** O ícone: quadrado ink com a curva de retenção e o marcador da queda em accent. */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="4" fill="var(--ink)" />
      <path
        d="M3,8.5 C4.5,8.3 6,8.5 7.5,9 C9,9.5 10,10.2 11,11.2 C11.6,11.8 12,12.5 12.3,13.8 C12.6,15.1 12.8,16.8 13.2,18.4 C13.6,19.8 14.5,20.8 16,21.5 C18,22.4 20.5,22.7 23,23 C24.5,23.2 26,23.3 29,23.5"
        stroke="var(--paper)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.8" cy="16" r="2.5" fill="var(--accent)" />
      <circle cx="12.8" cy="16" r="4.5" fill="none" stroke="var(--accent)" strokeWidth="0.75" opacity="0.4" />
    </svg>
  );
}

interface LogoProps {
  variant?: "horizontal" | "icon";
  size?: LogoSize;
  /** Texto acessível ("Publishub"), vindo das mensagens. */
  label: string;
  className?: string;
}

const ICON: Record<LogoSize, number> = { sm: 24, md: 32, lg: 40 };
const TEXT: Record<LogoSize, string> = { sm: "text-[16px]", md: "text-[20px]", lg: "text-[26px]" };

/** Marca do Publishub: ícone + wordmark em Fraunces. */
export function Logo({ variant = "horizontal", size = "md", label, className }: LogoProps) {
  if (variant === "icon") {
    return (
      <span role="img" aria-label={label} className={cn("inline-flex", className)}>
        <LogoMark size={ICON[size]} />
      </span>
    );
  }
  return (
    <span role="img" aria-label={label} className={cn("inline-flex select-none items-center gap-2.5 text-ink", className)}>
      <LogoMark size={ICON[size]} />
      <span aria-hidden="true" className={cn("font-display font-medium leading-none tracking-[-0.01em]", TEXT[size])}>
        Publishub
      </span>
    </span>
  );
}
