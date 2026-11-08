"use client";

import { useId, useState } from "react";
import { Button, type ButtonSize } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { FOUNDING } from "@/lib/site";

/** Leva ao Stripe Checkout da reserva do Founding plan. Erros aparecem logo abaixo e são anunciados. */
export function ReserveButton({ scanId, source, size = "lg", label }: { scanId?: string; source: string; size?: ButtonSize; label?: string }) {
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reserve() {
    setBusy(true);
    setError(null);
    track("checkout_started", { source, scan_id: scanId });
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scanId }) });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
      if (!response.ok || !data.url) throw new Error(data.error?.message || "Checkout is unavailable right now.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout is unavailable right now.");
      setBusy(false);
    }
  }

  return (
    <div>
      <Button size={size} onClick={reserve} disabled={busy} aria-describedby={error ? errorId : undefined}>
        {busy ? "Opening secure checkout…" : (label ?? `Reserve your Founding plan: $${FOUNDING.reservationUsd}`)}
      </Button>
      <p id={errorId} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
    </div>
  );
}
