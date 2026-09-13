"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RevealProps {
  children: ReactNode;
  /** Atraso em ms, para escalonar elementos vizinhos. */
  delay?: number;
  /** "curve": em vez de surgir, a curva dentro se desenha (ver globals.css). */
  variant?: "fade" | "curve";
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "figure" | "span" | "p";
}

/**
 * Marca o elemento como visível quando ele entra na tela (IntersectionObserver).
 * O movimento em si está no CSS, para respeitar prefers-reduced-motion.
 */
export function Reveal({ children, delay = 0, variant = "fade", className, style, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn(variant === "curve" ? "curve-draw" : "reveal", visible && "is-visible", className)}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
