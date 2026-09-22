"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DropzoneProps {
  file: File | null;
  onPick: (file: File | null) => void;
  accept: string;
  /** Texto principal do dropzone vazio. */
  prompt: string;
  /** Dica curta (formatos e limite). */
  hint: string;
  changeLabel: string;
  disabled?: boolean;
  error?: string | null;
  /** Ilustração à esquerda do texto — um traço, não um ícone genérico. */
  glyph?: ReactNode;
  /** Linha extra abaixo da dica (na landing, a pergunta que se escreve sozinha). */
  example?: ReactNode;
  className?: string;
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb.toFixed(1)} MB`;
}

export function Dropzone({ file, onPick, accept, prompt, hint, changeLabel, disabled, error, glyph, example, className }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {file ? (
        <div className="flex items-center gap-4 rounded-md border border-line bg-paper-raised p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-ink-muted">{formatBytes(file.size)}</p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => onPick(null)} className="text-[13px] font-medium text-ink-muted hover:text-ink">
              {changeLabel}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onPick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex w-full items-center gap-5 rounded-md border border-dashed bg-paper-raised p-6 text-left transition-colors",
            dragging ? "border-ink bg-paper" : "border-line hover:border-ink-muted",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {glyph && <span className="shrink-0 text-ink-muted">{glyph}</span>}
          <span className="min-w-0">
            <span className="block font-display text-[18px] font-medium leading-snug tracking-tight">{prompt}</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">{hint}</span>
            {example && <span className="mt-2 block">{example}</span>}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-[13px] text-refuted">
          {error}
        </p>
      )}
    </div>
  );
}
