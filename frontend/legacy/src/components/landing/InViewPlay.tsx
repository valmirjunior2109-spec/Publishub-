"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Faz as ilustrações em loop rodarem só enquanto estão na tela: pausa as animações
 * de CSS (data-playing, em globals.css) e as de SVG. Com "reduzir movimento", o SVG
 * fica parado no segundo indicado em `data-hold`, onde o desenho já está completo.
 */
export function InViewPlay({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const drawings = Array.from(el.querySelectorAll("svg"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const svg of drawings) {
        svg.setCurrentTime(Number(svg.dataset.hold ?? 0));
        svg.pauseAnimations();
      }
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.playing = String(entry.isIntersecting);
      for (const svg of drawings) {
        if (entry.isIntersecting) svg.unpauseAnimations();
        else svg.pauseAnimations();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
