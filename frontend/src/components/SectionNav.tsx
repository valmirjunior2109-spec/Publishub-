"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export interface SectionLink {
  id: string;
  label: string;
}

/**
 * As seções da página, numa barra que fica presa no topo: dá para saber onde se
 * está e pular para o que interessa sem rolar a página inteira.
 *
 * A seção ativa é a que está no terço de cima da tela (IntersectionObserver, sem
 * ouvir o scroll: nada roda a cada pixel rolado). No celular a barra rola de lado.
 */
export function SectionNav({ links, label, className }: { links: SectionLink[]; label: string; className?: string }) {
  const [active, setActive] = useState<string | null>(links[0]?.id ?? null);
  const ids = links.map((link) => link.id).join(",");

  useEffect(() => {
    const targets = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // o "agora" é uma faixa logo abaixo da barra: a seção que passa por ela é a ativa
      { rootMargin: "-120px 0px -60% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  if (links.length < 2) return null;

  return (
    <nav aria-label={label} className={cn("sticky top-14 z-20 -mx-5 border-b border-line bg-paper px-5 lg:top-0 lg:-mx-16 lg:px-16", className)}>
      <ol className="scroll-slim flex gap-1 overflow-x-auto py-2">
        {links.map((link) => (
          <li key={link.id} className="shrink-0">
            <a
              href={`#${link.id}`}
              aria-current={active === link.id ? "true" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-lg px-3 text-[13.5px] font-semibold transition-colors duration-150 hover:no-underline",
                active === link.id ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-[rgba(var(--ink-rgb),0.05)] hover:text-ink",
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
