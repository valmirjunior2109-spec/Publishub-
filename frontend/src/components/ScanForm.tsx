"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/**
 * O campo da URL da loja e o botão. O rótulo é visível, o erro fica ligado ao campo
 * (aria-describedby + aria-invalid) e o andamento é anunciado numa região viva.
 */
export function ScanForm({ source, className, dark = false }: { source: string; className?: string; dark?: boolean }) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)} aria-busy={busy}>
      <label htmlFor={inputId} className={cn("block text-[15px] font-semibold", dark ? "text-white" : "text-ink")}>
        Your store URL
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Input
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
          onChange={(event) => setUrl(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          disabled={busy}
          className="min-h-12 sm:flex-1"
        />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Starting scan…" : "Scan my store free"}
        </Button>
      </div>
      <p id={hintId} className={cn("mt-2 text-sm", dark ? "text-white" : "text-muted")}>
        Free. No account needed. We check up to 4 pages in about a minute.
      </p>
      <p id={errorId} role="alert" className={cn("mt-2 text-[15px] font-semibold", dark ? "text-white" : "text-critical", !error && "sr-only")}>
        {error ?? ""}
      </p>
    </form>
  );
}
