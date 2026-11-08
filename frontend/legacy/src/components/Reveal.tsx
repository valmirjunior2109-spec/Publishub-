"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RevealProps {
  children: ReactNode;
  /** Atraso em ms, para escalonar elementos vizinhos. */
  delay?: number;
  /** "curve": em vez de surgir, a curva dentro se desenha (ver globals.css). */
  variant?: "fade" | "curve";
  /**
   * Para o que já está na tela ao abrir a página (o hero): entra só com o
   * deslize, pelo CSS, sem esperar o JavaScript. O texto aparece no primeiro
   * quadro, que é o que o Google mede como carregamento (LCP).
   */
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "ul" | "figure" | "span" | "p";
}

/**
 * Marca o elemento como visível quando ele entra na tela (IntersectionObserver).
 * O movimento em si está no CSS, para respeitar prefers-reduced-motion.
 */
export function Reveal({ children, delay = 0, variant = "fade", eager = false, className, style, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || eager) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // aparece assim que a ponta entra na tela: esperar 15% dela visível deixava a rolagem rápida "atrasada"
      { threshold: 0.01, rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <Tag
      ref={ref as never}
      className={cn(eager ? "reveal-eager" : variant === "curve" ? "curve-draw" : "reveal", visible && "is-visible", className)}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
