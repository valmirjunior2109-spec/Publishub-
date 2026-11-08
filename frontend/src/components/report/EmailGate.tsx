"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";

/** O e-mail abre o relatório completo neste navegador (e vira um lead). */
export function EmailGate({ scanId, lockedCount, onUnlocked }: { scanId: string; lockedCount: number; onUnlocked: () => void }) {
  const inputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/scan/${scanId}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message || "We couldn't save your email. Please try again.");
      track("email_captured", { scan_id: scanId, source: "report" });
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your email. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="unlock-heading" className="rounded-xl border-2 border-accent bg-accent-soft p-5 sm:p-6">
      <h2 id="unlock-heading" className="text-xl font-semibold">
        See the full report: {lockedCount} more {lockedCount === 1 ? "issue type" : "issue types"}
      </h2>
      <p className="mt-1 text-[16px]">Enter your email to unlock every issue, with the affected elements and fix guidance.</p>
      <form onSubmit={submit} noValidate className="mt-4">
        <label htmlFor={inputId} className="block font-semibold">
          Email address
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={busy}
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Unlocking…" : "Show full report"}
          </Button>
        </div>
        <p id={errorId} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
          {error ?? ""}
        </p>
        <p className="mt-3 text-sm text-muted">
          No spam. See our <a href="/privacy">privacy policy</a>.
        </p>
      </form>
    </section>
  );
}
