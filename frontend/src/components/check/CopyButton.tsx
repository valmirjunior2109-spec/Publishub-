"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

/**
 * Um botão que copia um texto e diz que copiou ("Relatório copiado"). Se o navegador não deixar copiar,
 * mostra o texto numa caixa já selecionada, para a pessoa copiar à mão: nunca finge que copiou.
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
  failedLabel,
  onCopy,
  variant = "secondary",
  size = "md",
  icon,
  className,
}: {
  /** O texto, ou uma função que o monta na hora do clique. */
  text: string | (() => string);
  label: string;
  copiedLabel: string;
  failedLabel: string;
  onCopy?: (ok: boolean) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [fallback, setFallback] = useState("");
  const areaId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === "failed") area.current?.select();
  }, [state]);

  async function copy() {
    const value = typeof text === "function" ? text() : text;
    const ok = await copyText(value);
    onCopy?.(ok);
    setFallback(ok ? "" : value);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    if (ok) timer.current = setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className={cn("min-w-0", className)}>
      <button type="button" onClick={() => void copy()} className={buttonClasses(variant, size, "w-full sm:w-auto")} aria-describedby={state === "failed" ? areaId : undefined}>
        {state === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : (icon ?? <Copy aria-hidden="true" className="h-4 w-4" />)}
        {state === "copied" ? copiedLabel : label}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? copiedLabel : ""}
      </span>
      {state === "failed" && (
        <div className="mt-2">
          <label htmlFor={areaId} className="text-sm font-semibold">
            {failedLabel}
          </label>
          <textarea
            ref={area}
            id={areaId}
            readOnly
            value={fallback}
            rows={6}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-md border border-line-strong bg-surface p-2 font-mono text-[13px] text-ink"
          />
        </div>
      )}
    </div>
  );
}
