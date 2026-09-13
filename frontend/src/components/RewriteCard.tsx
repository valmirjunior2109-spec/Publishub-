"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { Rewrite } from "@/lib/types";

interface RewriteCardProps {
  index: number;
  rewrite: Rewrite;
  /** A versão em destaque (a primeira): fundo accent-soft. */
  accent?: boolean;
  className?: string;
}

/** Uma frase alternativa, pronta para regravar — o entregável do produto. */
export function RewriteCard({ index, rewrite, accent = false, className }: RewriteCardProps) {
  const t = useTranslations("Analysis.rewrite");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(rewrite.text);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: não trava
    }
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-md border p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5",
        accent ? "border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft hover:border-[rgba(var(--accent-rgb),0.5)]" : "border-line bg-paper-raised hover:border-ink-muted",
        className,
      )}
    >
      <span className={cn("t-label mb-3.5", accent ? "text-accent" : "text-ink-muted")}>{t("version", { index })}</span>
      <p className="mb-4 flex-1 font-display text-[17px] leading-[1.5] text-ink">&ldquo;{rewrite.text}&rdquo;</p>
      <p className="mb-5 text-[13px] leading-[1.6] text-ink-muted">{rewrite.why}</p>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className={cn(
          "inline-flex select-none items-center gap-1.5 self-start rounded-sm border px-3.5 py-[7px] text-[12px] font-medium uppercase tracking-[0.05em] transition-colors",
          copied ? "border-[rgba(var(--accent-rgb),0.4)] bg-[rgba(var(--accent-rgb),0.08)] text-accent" : "border-line bg-transparent text-ink-muted hover:border-ink-muted hover:text-ink",
        )}
      >
        {copied ? `✓ ${t("copied")}` : t("copyPhrase")}
      </button>
    </div>
  );
}
