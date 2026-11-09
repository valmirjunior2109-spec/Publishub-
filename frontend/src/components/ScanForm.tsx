"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Clock, FileText, Files, Globe, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/** Lojas Shopify públicas e conhecidas, para quem quer ver o scanner antes de usar a própria loja. */
const EXAMPLE_STORES = ["allbirds.com", "gymshark.com", "bombas.com"];

/** O placeholder "digitando": escreve um exemplo, apaga e termina no texto final. Menos de 5 s no total. */
const TYPE_SCRIPT = ["allbirds.com", "yourstore.com"];
const FINAL_PLACEHOLDER = "yourstore.com";

function useTypedPlaceholder(): string {
  const [text, setText] = useState(FINAL_PLACEHOLDER);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    let at = 500;
    const at_ = (ms: number, value: string) => timers.push(window.setTimeout(() => setText(value), ms));
    at_(0, "");
    TYPE_SCRIPT.forEach((word, index) => {
      for (let i = 1; i <= word.length; i += 1) at_((at += 70), word.slice(0, i));
      if (index < TYPE_SCRIPT.length - 1) {
        at += 800;
        for (let i = word.length - 1; i >= 0; i -= 1) at_((at += 30), word.slice(0, i));
        at += 200;
      }
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);
  return text;
}

/**
 * O campo da URL da loja, no formato de "caixa de prompt": o campo em cima, os detalhes do scan
 * e o botão de enviar embaixo, e atalhos (lojas de exemplo e o relatório de exemplo) fora da caixa.
 *
 * Acessibilidade: o rótulo é visível, o erro fica ligado ao campo (aria-describedby + aria-invalid),
 * o andamento é anunciado numa região viva e o foco aparece na caixa inteira (focus-within).
 * As animações respeitam "reduzir movimento" e nenhuma roda sozinha por mais de 5 s.
 */
export function ScanForm({
  source,
  className,
  align = "left",
}: {
  source: string;
  className?: string;
  align?: "left" | "center";
}) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const placeholder = useTypedPlaceholder();
  const ready = url.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!url.trim()) {
      setError("Enter your store's URL, for example yourstore.com.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const data = (await response.json().catch(() => ({}))) as { scanId?: string; url?: string; error?: { message?: string } };
      if (!response.ok || !data.scanId) throw new Error(data.error?.message || "We couldn't start the scan. Please try again.");
      track("scan_started", { source, store_url: data.url });
      router.push(`/scan/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't start the scan. Please try again.");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function fillExample(store: string) {
    setUrl(store);
    setError(null);
    inputRef.current?.focus();
  }

  const centered = align === "center";

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", centered && "mx-auto", className)} aria-busy={busy}>
      <label htmlFor={inputId} className={cn("block text-[15px] font-semibold text-ink", centered && "text-center")}>
        Your store URL
      </label>

      {/* a caixa: borda em gradiente que gira com o foco ou o mouse */}
      <div className="prompt-shell mt-3" data-error={error ? "true" : undefined}>
        <div className="prompt-box relative overflow-hidden text-left">
          <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
            <Globe aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--prompt-placeholder)]" />
            <input
              ref={inputRef}
              id={inputId}
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={placeholder}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${errorId} ${hintId}` : hintId}
              disabled={busy}
              className="min-h-12 w-full min-w-0 bg-transparent text-lg text-[var(--prompt-ink)] caret-[#9147FF] placeholder:text-[var(--prompt-placeholder)] focus:outline-none focus-visible:outline-none disabled:cursor-wait"
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 pl-4 sm:pl-5">
            <ul className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--prompt-detail)]" aria-label="What the scan includes">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--icon-blue)]" />
                WCAG 2.2 AA
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Files aria-hidden="true" className="h-4 w-4 text-[var(--icon-orange)]" />
                Up to 4 pages
              </li>
              <li className="hidden items-center gap-1.5 sm:inline-flex">
                <Clock aria-hidden="true" className="h-4 w-4 text-[var(--icon-mint)]" />
                About a minute
              </li>
            </ul>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                "shine group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-all duration-200",
                "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--prompt-focus)]",
                "disabled:cursor-wait",
                ready || busy
                  ? "border-transparent bg-[var(--prompt-ready-bg)] text-[var(--prompt-ready-ink)] shadow-[0_0_24px_-4px_rgba(255,138,61,0.65)] hover:bg-[var(--prompt-ready-hover)]"
                  : "border-[var(--prompt-btn-border)] bg-transparent text-[var(--prompt-ink)] hover:bg-[var(--prompt-btn-hover)]",
              )}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
              )}
              {busy ? "Starting scan…" : "Scan free"}
            </button>
          </div>

          {/* barra de progresso enquanto o scan começa */}
          {busy ? (
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-[var(--prompt-track)]">
              <div className="h-full w-1/3 animate-[scan-bar_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#9147FF] via-[#C18AFF] to-[#F2D7A0]" />
            </div>
          ) : null}
        </div>
      </div>

      {/* atalhos fora da caixa */}
      <div className={cn("mt-5 flex flex-wrap items-center gap-2", centered && "justify-center")}>
        <span className="inline-flex items-center gap-1 text-sm text-muted">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-pop" />
          Try:
        </span>
        {EXAMPLE_STORES.map((store) => (
          <button
            key={store}
            type="button"
            onClick={() => fillExample(store)}
            disabled={busy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3.5 text-sm text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <Globe aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
            {store}
          </button>
        ))}
        <Link
          href="/scan/sample"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3.5 text-sm text-ink no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
        >
          <FileText aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
          Sample report
        </Link>
      </div>

      <p id={hintId} className={cn("mt-3 text-sm text-muted", centered && "text-center")}>
        Free. No account needed. Works best on Shopify stores.
      </p>
      <p id={errorId} role="alert" className={cn("mt-2 text-[15px] font-semibold text-critical", !error && "sr-only", centered && "text-center")}>
        {error ?? ""}
      </p>
    </form>
  );
}
