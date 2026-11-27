"use client";

import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { attribution, sendFunnelEvent } from "@/lib/funnel";
import { apiError, type Locale } from "@/lib/i18n";

/** Abre o Stripe Checkout da assinatura Founding Customers. Erros aparecem logo abaixo e são anunciados. */
export function FoundingCheckoutButton({ label = "Become a founding customer", locale = "en" }: { label?: string; locale?: Locale }) {
  const unavailable = locale === "pt" ? "O pagamento não está disponível agora." : "Checkout is unavailable right now.";
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    sendFunnelEvent("cta_click", "founding_checkout");
    track("checkout_started", { source: "founding_customers" });
    try {
      const response = await fetch("/api/founding/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ utm: attribution().utm, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: { message?: string; code?: string } };
      if (!response.ok || !data.url) throw new Error(apiError(locale, data.error, unavailable));
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : unavailable);
      setBusy(false);
    }
  }

  return (
    <div>
      <Button size="lg" onClick={() => void start()} disabled={busy} aria-describedby={error ? errorId : undefined} className="h-auto w-full !whitespace-normal py-3 text-center">
        {busy ? (
          <>
            <PixelLoader />
            {locale === "pt" ? "Abrindo o pagamento seguro…" : "Opening secure checkout…"}
          </>
        ) : (
          <>
            {label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </Button>
      <p id={errorId} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
    </div>
  );
}
