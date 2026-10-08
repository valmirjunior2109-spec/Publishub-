import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/cn";

/** O rótulo de cada seção da landing: o número em azul, um traço e o nome. Sem número, só o nome. */
export function SectionIndex({ index, label, className }: { index?: string; label: string; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 font-mono text-[12px] font-medium uppercase tracking-[0.08em]", className)}>
      {index && (
        <>
          <span className="text-accent">{index}</span>
          <span aria-hidden="true" className="h-px w-6 bg-line" />
        </>
      )}
      <span className={index ? "text-ink-muted" : "text-accent"}>{label}</span>
    </p>
  );
}

interface SectionHeaderProps {
  index?: string;
  label: string;
  title: string;
  lead?: ReactNode;
  /** Centralizado: o hero de uma seção. O padrão é alinhado à esquerda, como uma página editorial. */
  center?: boolean;
  className?: string;
}

/** Número, título e linha de apoio: o mesmo começo em toda seção. */
export function SectionHeader({ index, label, title, lead, center = false, className }: SectionHeaderProps) {
  return (
    <Reveal className={cn(center ? "mx-auto max-w-[760px] text-center" : "max-w-[760px]", className)}>
      <SectionIndex index={index} label={label} className={center ? "justify-center" : undefined} />
      <h2 className="t-h2 mt-5 whitespace-pre-line text-balance">{title}</h2>
      {lead && <p className={cn("t-lead mt-5 max-w-[60ch]", center && "mx-auto")}>{lead}</p>}
    </Reveal>
  );
}

/**
 * A moldura das telas do produto: uma barra discreta com o título no meio e,
 * à direita, o que a tela quiser (um status, um botão). É ilustração: o
 * conteúdo dela não recebe foco nem cliques.
 */
export function AppWindow({ title, meta, children, className, label }: { title: string; meta?: ReactNode; children: ReactNode; className?: string; label?: string }) {
  return (
    <figure aria-label={label ?? title} className={cn("overflow-hidden rounded-3xl border border-line bg-paper-raised shadow-window", className)}>
      <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-4">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </span>
        <span className="truncate font-mono text-[12px] text-ink-muted">{title}</span>
        <span className="flex justify-end">{meta}</span>
      </div>
      {children}
    </figure>
  );
}

/** Um botão desenhado dentro das telas de exemplo: parece o do produto, mas não é clicável. */
export function MockButton({ children, variant = "primary", className }: { children: ReactNode; variant?: "primary" | "secondary"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-9 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3.5 text-[13px] font-semibold",
        variant === "primary" ? "border-transparent bg-accent text-on-accent" : "border-line bg-paper-raised text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
