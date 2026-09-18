"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

/** "rgb(247, 244, 237)" → "#F7F4ED" (o navegador resolve o light-dark() por nós). */
function toHex(color: string): string {
  const parts = color.match(/\d+(\.\d+)?/g);
  if (!parts || parts.length < 3) return color;
  return `#${parts
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/**
 * Amostra de um token: a cor sai do próprio CSS, então a página de referência
 * mostra sempre o valor do tema em exibição — e não uma tabela do tema claro.
 */
export function TokenSwatch({ name, token }: { name: string; token: string }) {
  const { theme } = useTheme();
  const swatch = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState("");

  useEffect(() => {
    const read = () => {
      if (swatch.current) setHex(toHex(getComputedStyle(swatch.current).backgroundColor));
    };
    read();
    // sem escolha no seletor, o tema é o do sistema: relê quando ele muda
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    system.addEventListener("change", read);
    return () => system.removeEventListener("change", read);
  }, [theme]);

  return (
    <div>
      <div ref={swatch} className="mb-2 h-16 rounded-sm border border-line" style={{ backgroundColor: `var(${token})` }} />
      <div className="text-[12px] text-ink-muted">{name}</div>
      <div className="text-[11px] tabular-nums text-ink-muted opacity-70">{hex || token}</div>
    </div>
  );
}
