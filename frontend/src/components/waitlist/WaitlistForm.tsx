"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { attribution, sendFunnelEvent } from "@/lib/funnel";
import { AI_TOOLS, WAITLIST_EMAIL_RE, type WaitlistForm as FormName } from "@/lib/waitlist";
import { setJoined, useJoined } from "./joined";
import { ShareBox } from "./ShareBox";

const SELECT =
  "min-h-11 w-full rounded-md border border-line-strong bg-card px-3 text-base text-ink disabled:cursor-not-allowed disabled:bg-surface";

/**
 * A inscrição na lista de espera. Só o e-mail é obrigatório; nome e ferramenta de IA são opcionais
 * (no formulário do topo, ficam num <details> para não pesar). O sucesso só aparece depois que o
 * servidor confirma a linha gravada.
 */
export function WaitlistForm({ form, submitLabel, layout }: { form: FormName; submitLabel: string; layout: "inline" | "stacked" }) {
  const ids = { email: useId(), name: useId(), tool: useId(), error: useId(), note: useId(), honeypot: useId() };
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tool, setTool] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submittedHere, setSubmittedHere] = useState(false);
  const mountedAt = useRef(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const joined = useJoined();

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    // leva o foco à confirmação, no formulário que foi enviado, para o leitor de tela ler na hora
    if (joined && submittedHere) doneRef.current?.focus();
  }, [joined, submittedHere]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    sendFunnelEvent("cta_click", `${form}_submit`);
    const value = email.trim();
    if (!value || !WAITLIST_EMAIL_RE.test(value)) {
      setError(value ? "Enter a valid email address, like you@company.com." : "Enter your email address.");
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, name, aiTool: tool || undefined, form, website, elapsedMs: Date.now() - mountedAt.current, ...attribution() }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: { message?: string } };
      if (!response.ok || (data.status !== "joined" && data.status !== "duplicate")) {
        throw new Error(data.error?.message || "We couldn't save your email. Please try again.");
      }
      if (data.status === "joined") track("waitlist_joined", { form, ai_tool: tool || null, ...attribution().utm });
      setSubmittedHere(true);
      setJoined(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your email. Please try again.");
      setBusy(false);
      emailRef.current?.focus();
    }
  }

  if (joined) {
    return (
      <div className="rounded-xl border border-line-strong bg-card p-5 text-left shadow-raised sm:p-6">
        <p ref={doneRef} tabIndex={-1} role="status" className="flex items-start gap-3 text-lg focus:outline-none">
          <CircleCheck aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-success" />
          <span>
            <strong className="font-semibold">{joined === "joined" ? "You're on the list!" : "You're already on the list."}</strong> We&apos;ll notify you as soon as Publishub early access opens.
          </span>
        </p>
        <ShareBox />
      </div>
    );
  }

  const optional = (
    <div className={cn("grid gap-4", layout === "inline" && "mt-3 sm:grid-cols-2")}>
      <div>
        <label htmlFor={ids.name} className="block text-[15px] font-semibold">
          Name <span className="font-normal text-muted">(optional)</span>
        </label>
        <Input id={ids.name} name="name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} className="mt-1" />
      </div>
      <div>
        <label htmlFor={ids.tool} className="block text-[15px] font-semibold">
          Primary AI coding tool <span className="font-normal text-muted">(optional)</span>
        </label>
        <select id={ids.tool} name="aiTool" value={tool} onChange={(e) => setTool(e.target.value)} disabled={busy} className={cn(SELECT, "mt-1")}>
          <option value="">Choose one</option>
          {AI_TOOLS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const describedBy = [error ? ids.error : null, ids.note].filter(Boolean).join(" ");

  const emailProps = {
    ref: emailRef,
    id: ids.email,
    type: "email",
    name: "email",
    inputMode: "email" as const,
    autoComplete: "email",
    autoCapitalize: "none",
    spellCheck: false,
    required: true,
    maxLength: 254,
    placeholder: "you@company.com",
    value: email,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      if (error) setError(null);
    },
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    disabled: busy,
  };

  return (
    <form onSubmit={submit} noValidate className="relative text-left" aria-label={layout === "inline" ? "Join the waitlist" : "Get early access"}>
      {layout === "inline" ? (
        <>
          {/* no topo: campo e botão numa caixa só; o rótulo fica para o leitor de tela e o placeholder mostra o formato */}
          <label htmlFor={ids.email} className="sr-only">
            Email address
          </label>
          <div
            className={cn(
              "flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-raised transition-colors sm:flex-row sm:items-center",
              "focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--focus)]",
              error ? "border-2 border-critical focus-within:outline-critical" : "border-line-strong",
            )}
          >
            <input
              {...emailProps}
              className="min-h-12 w-full min-w-0 flex-1 rounded-xl bg-transparent px-3 text-base text-ink placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed"
            />
            <Button type="submit" size="lg" disabled={busy} className="rounded-xl sm:min-w-[11.5rem]">
              {busy ? "Joining…" : submitLabel}
              {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </Button>
          </div>
        </>
      ) : (
        <>
          <label htmlFor={ids.email} className="block text-[15px] font-semibold">
            Email address
          </label>
          <Input {...emailProps} className="mt-1.5 min-h-12" />
        </>
      )}

      {layout === "inline" ? (
        <details className="group mt-2 text-center [&[open]]:text-left">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>
            Add your name and AI coding tool (optional)
          </summary>
          {optional}
        </details>
      ) : (
        <div className="mt-4">{optional}</div>
      )}

      {layout === "stacked" ? (
        <Button type="submit" size="lg" disabled={busy} className="mt-5 w-full">
          {busy ? "Joining…" : submitLabel}
          {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </Button>
      ) : null}

      {/* só robô preenche: fica fora da tela e fora da ordem do Tab */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={ids.honeypot}>Website</label>
        <input id={ids.honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <p id={ids.error} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
      <p id={ids.note} className={cn("mt-2 text-sm text-muted", layout === "inline" && "text-center")}>
        {layout === "inline" ? (
          <>
            Free to join · Only early-access emails · Unsubscribe anytime · <a href="/privacy">Privacy</a>
          </>
        ) : (
          <>
            Free to join. We&apos;ll only email you about Publishub early access, and you can unsubscribe anytime. <a href="/privacy">Privacy policy</a>.
          </>
        )}
      </p>
    </form>
  );
}
