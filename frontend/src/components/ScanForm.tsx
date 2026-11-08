"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Clock, FileText, Files, Globe, Loader2, ShieldCheck } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/** Lojas Shopify públicas e conhecidas, para quem quer ver o scanner antes de usar a própria loja. */
const EXAMPLE_STORES = ["allbirds.com", "gymshark.com", "bombas.com"];

/**
 * O campo da URL da loja, no formato de "caixa de prompt": o campo em cima, os detalhes do scan
 * e o botão de enviar embaixo, e atalhos (lojas de exemplo e o relatório de exemplo) fora da caixa.
 *
 * Acessibilidade: o rótulo é visível, o erro fica ligado ao campo (aria-describedby + aria-invalid),
 * o andamento é anunciado numa região viva e o foco aparece na caixa inteira (focus-within),
 * com contraste sobre o fundo claro da página.
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

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", align === "center" && "mx-auto", className)} aria-busy={busy}>
      <label htmlFor={inputId} className={cn("block text-[15px] font-semibold text-ink", align === "center" && "text-center")}>
        Your store URL
      </label>

      {/* a caixa */}
      <div
        className={cn(
          "mt-2 rounded-2xl border border-ink bg-ink text-left shadow-[0_18px_40px_-24px_rgba(11,19,36,0.55)] transition-shadow",
          "focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2",
          // com erro, a borda fica vermelha também com o foco dentro (o texto do erro e o aria-invalid continuam)
          error
            ? "outline outline-[3px] outline-offset-2 outline-critical focus-within:outline-critical"
            : "focus-within:outline-accent",
        )}
      >
        <div className="flex items-center gap-3 px-4 pt-4">
          <Globe aria-hidden="true" className="h-5 w-5 shrink-0 text-[#a9b4c6]" />
          <input
            ref={inputRef}
            id={inputId}
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="yourstore.com"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${errorId} ${hintId}` : hintId}
            disabled={busy}
            className={cn(
              "min-h-12 w-full min-w-0 bg-transparent text-lg text-white placeholder:text-[#a9b4c6]",
              "focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed",
            )}
          />
        </div>

        <div className="flex items-center justify-between gap-3 p-3 pl-4">
          <ul className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#c3cbd8]" aria-label="What the scan includes">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              WCAG 2.2 AA
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Files aria-hidden="true" className="h-4 w-4" />
              Up to 4 pages
            </li>
            <li className="hidden items-center gap-1.5 sm:inline-flex">
              <Clock aria-hidden="true" className="h-4 w-4" />
              About a minute
            </li>
          </ul>
          <button
            type="submit"
            disabled={busy}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-colors",
              "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white",
              "disabled:cursor-wait",
              ready || busy
                ? "border-white bg-white text-ink hover:bg-[#e6ebf3]"
                : "border-[#667085] bg-transparent text-white hover:bg-white/10",
            )}
          >
            {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowUp aria-hidden="true" className="h-4 w-4" />}
            {busy ? "Starting scan…" : "Scan free"}
          </button>
        </div>
      </div>

      {/* atalhos fora da caixa */}
      <div className={cn("mt-4 flex flex-wrap items-center gap-2", align === "center" && "justify-center")}>
        <span className="text-sm text-muted">Try:</span>
        {EXAMPLE_STORES.map((store) => (
          <button
            key={store}
            type="button"
            onClick={() => fillExample(store)}
            disabled={busy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-sm text-ink transition-colors hover:border-ink hover:bg-surface disabled:opacity-60"
          >
            <Globe aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
            {store}
          </button>
        ))}
        <Link
          href="/scan/sample"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-sm text-ink no-underline transition-colors hover:border-ink hover:bg-surface hover:text-ink"
        >
          <FileText aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
          Sample report
        </Link>
      </div>

      <p id={hintId} className={cn("mt-3 text-sm text-muted", align === "center" && "text-center")}>
        Free. No account needed. Works best on Shopify stores.
      </p>
      <p id={errorId} role="alert" className={cn("mt-2 text-[15px] font-semibold text-critical", !error && "sr-only", align === "center" && "text-center")}>
        {error ?? ""}
      </p>
    </form>
  );
}
