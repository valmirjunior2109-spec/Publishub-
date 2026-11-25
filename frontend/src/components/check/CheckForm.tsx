"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { attribution, sendFunnelEvent } from "@/lib/funnel";
import { deleteTokenKey } from "@/lib/check/types";
import { WAITLIST_EMAIL_RE } from "@/lib/waitlist";
import { setJoined } from "@/components/waitlist/joined";

/**
 * O teste grátis: URL do app + e-mail → POST /api/check (que inscreve o e-mail na lista de espera)
 * → o relatório em /check/[id], já mostrando "You're on the list".
 */
export function CheckForm({ source, className }: { source: string; className?: string }) {
  const ids = { url: useId(), email: useId(), error: useId(), note: useId() };
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    sendFunnelEvent("cta_click", `check_${source}`);
    if (!url.trim()) {
      setError("Enter your app's URL, like myapp.vercel.app.");
      inputRef.current?.focus();
      return;
    }
    const mail = email.trim();
    if (!mail || !WAITLIST_EMAIL_RE.test(mail)) {
      setError(mail ? "Enter a valid email address, like you@company.com." : "Enter your email to get your report.");
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, email: mail, ...attribution() }) });
      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        deleteToken?: string;
        waitlist?: { status?: string; refCode?: string | null; position?: number | null; referrals?: number };
        error?: { message?: string };
      };
      if (!response.ok || !data.id) throw new Error(data.error?.message || "We couldn't start the check. Please try again.");
      // só este navegador pode apagar o relatório depois
      try {
        if (data.deleteToken) window.localStorage.setItem(deleteTokenKey(data.id), data.deleteToken);
      } catch {
        // sem armazenamento: o relatório funciona igual, só sem o botão de apagar
      }
      const wl = data.waitlist;
      if (wl && (wl.status === "joined" || wl.status === "duplicate")) {
        if (wl.status === "joined") track("waitlist_joined", { form: "check", source, referred: Boolean(attribution().ref), ...attribution().utm });
        // o relatório mostra "You're on the list" em vez de pedir o e-mail de novo
        setJoined({ status: wl.status, refCode: wl.refCode ?? null, position: wl.position ?? null, referrals: wl.referrals ?? 0 });
      }
      track("app_check_started", { source });
      router.push(`/check/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't start the check. Please try again.");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={submit} noValidate className={cn("text-left", className)} aria-label="Check your app">
      <label htmlFor={ids.url} className="sr-only">
        Your app&apos;s URL
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-md border bg-card p-2 shadow-[5px_5px_0_0_var(--line)]",
          "focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--focus)]",
          error ? "border-2 border-critical focus-within:outline-critical" : "border-line-strong",
        )}
      >
        <input
          ref={inputRef}
          id={ids.url}
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={2048}
          placeholder="myapp.vercel.app"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? ids.error : null, ids.note].filter(Boolean).join(" ")}
          disabled={busy}
          className="min-h-12 w-full min-w-0 flex-1 rounded-sm bg-transparent px-3 font-mono text-base text-ink placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <div className="flex flex-col gap-2 border-t border-line pt-2 sm:flex-row sm:items-center">
          <label htmlFor={ids.email} className="sr-only">
            Your email
          </label>
          <input
            ref={emailRef}
            id={ids.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={[error ? ids.error : null, ids.note].filter(Boolean).join(" ")}
            disabled={busy}
            className="min-h-12 w-full min-w-0 flex-1 rounded-sm bg-transparent px-3 text-base text-ink placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed"
          />
        <Button type="submit" size="lg" disabled={busy} className="rounded-sm sm:min-w-[12rem]">
          {busy ? (
            <>
              <PixelLoader />
              Starting…
            </>
          ) : (
            <>
              Check my app free
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </>
          )}
        </Button>
        </div>
      </div>
      <p id={ids.error} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
      <p id={ids.note} className="mt-2 text-center text-sm text-muted">
        Free · Your email joins the Publishub early-access list (unsubscribe anytime) · Read-only: we never log in, submit forms or change anything
      </p>
    </form>
  );
}
