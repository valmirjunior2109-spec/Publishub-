"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PixelIcon, PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { sendFunnelEvent } from "@/lib/funnel";
import { apiError, type Locale } from "@/lib/i18n";
import { PAYING_LABELS, PAYING_OPTIONS, VERIFICATION_NOTE_MAX, type Paying } from "@/lib/verification";
import { PRIORITY_FLOW_LABELS, PRIORITY_FLOWS, WAITLIST_EMAIL_RE } from "@/lib/waitlist";

const COPY = {
  en: {
    titleProblems: "This check didn't open your sign-up, login or checkout.",
    titleClean: "Your public pages look fine. Your sign-up, login and checkout weren't checked.",
    text: "That's where an AI change usually breaks things quietly. Tell me which flow matters most and I'll reply personally by email to set up a check of it.",
    by: "Valmir, founder of Publishub",
    open: "Ask me to check my flow",
    flow: "Which flow should I check?",
    choose: "Choose one",
    paying: "Does your app already have paying users?",
    email: "Your email",
    app: "Your app's URL",
    note: "Anything I should know? (optional)",
    notePlaceholder: "e.g. login is with Google, checkout uses Stripe",
    send: "Send request",
    sending: "Sending…",
    needFlow: "Choose the flow you'd like checked.",
    badEmail: "Enter a valid email address, like you@company.com.",
    error: "We couldn't send your request. Please try again.",
    done: "Got it. I'll reply personally by email.",
    doneText: "I read every request myself. Your free check and the waitlist don't change.",
    privacy: "Only I see this. I'll use your email to reply about this request.",
  },
  pt: {
    titleProblems: "Este teste não abriu seu cadastro, login nem checkout.",
    titleClean: "As páginas públicas estão ok. Seu cadastro, login e checkout não foram testados.",
    text: "É ali que uma mudança da IA costuma quebrar em silêncio. Me diga qual fluxo mais importa e eu respondo pessoalmente por e-mail para combinar a verificação dele.",
    by: "Valmir, fundador da Publishub",
    open: "Pedir verificação do meu fluxo",
    flow: "Qual fluxo eu devo verificar?",
    choose: "Escolha um",
    paying: "Seu app já tem usuários pagantes?",
    email: "Seu e-mail",
    app: "URL do seu app",
    note: "Algo que eu deva saber? (opcional)",
    notePlaceholder: "ex.: o login é com Google, o checkout usa Stripe",
    send: "Enviar pedido",
    sending: "Enviando…",
    needFlow: "Escolha o fluxo que você quer verificado.",
    badEmail: "Digite um e-mail válido, como voce@empresa.com.",
    error: "Não conseguimos enviar seu pedido. Tente de novo.",
    done: "Recebido. Eu respondo pessoalmente por e-mail.",
    doneText: "Eu leio cada pedido pessoalmente. Seu teste grátis e a waitlist continuam iguais.",
    privacy: "Só eu vejo isto. Uso seu e-mail para responder sobre este pedido.",
  },
} satisfies Record<Locale, unknown>;

const SELECT = "min-h-11 w-full rounded-md border border-line-strong bg-card px-3 text-base text-ink disabled:cursor-not-allowed disabled:bg-surface";

/**
 * O pedido de verificação manual, no fim do relatório: o teste grátis não abre cadastro, login nem checkout,
 * então quem quer esses fluxos verificados pede direto ao fundador. É o começo do serviço feito à mão com os
 * primeiros clientes. Grava no banco e chega por e-mail ao Valmir (/api/verification-request).
 */
export function VerificationRequest({ checkId, appUrl, clean, locale }: { checkId: string; appUrl: string; clean: boolean; locale: Locale }) {
  const t = COPY[locale];
  const ids = { flow: useId(), paying: useId(), email: useId(), app: useId(), note: useId(), error: useId(), honeypot: useId() };
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState("");
  const [paying, setPaying] = useState<Paying | "">("");
  const [email, setEmail] = useState("");
  const [app, setApp] = useState(appUrl);
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef(0);
  const flowRef = useRef<HTMLSelectElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (open) {
      openedAt.current = Date.now();
      flowRef.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    if (state === "done") doneRef.current?.focus();
  }, [state]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state !== "idle") return;
    if (!flow) {
      setError(t.needFlow);
      flowRef.current?.focus();
      return;
    }
    if (!WAITLIST_EMAIL_RE.test(email.trim())) {
      setError(t.badEmail);
      return;
    }
    setState("busy");
    setError(null);
    try {
      const response = await fetch("/api/verification-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), flow, paying: paying || undefined, appUrl: app.trim() || undefined, note: note.trim() || undefined, checkId, locale, website, elapsedMs: Date.now() - openedAt.current }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: { message?: string; code?: string } };
      if (!response.ok || data.status !== "received") throw new Error(apiError(locale, data.error, t.error));
      sendFunnelEvent("cta_click", "check_verification_request_sent");
      track("verification_requested", { flow, paying: paying || null, clean });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setState("idle");
    }
  }

  const busy = state === "busy";

  return (
    <section aria-labelledby={`${ids.flow}-title`} className="rounded-md border-2 border-action bg-card p-5 shadow-pixel-lg sm:p-8">
      <h2 id={`${ids.flow}-title`} className="text-2xl font-bold sm:text-3xl">
        {clean ? t.titleClean : t.titleProblems}
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.text}</p>
      <p className="mt-2 text-sm font-semibold">— {t.by}</p>

      {state === "done" ? (
        <div className="mt-5 rounded-md border border-line bg-surface p-4">
          <p ref={doneRef} tabIndex={-1} role="status" className="flex items-start gap-2 text-lg font-semibold focus:outline-none">
            <PixelIcon name="pass" size={16} className="mt-1.5 shrink-0 text-success" />
            {t.done}
          </p>
          <p className="mt-1 text-muted">{t.doneText}</p>
        </div>
      ) : !open ? (
        <Button
          size="lg"
          className="mt-5 h-auto w-full !whitespace-normal py-3 sm:w-auto"
          onClick={() => {
            setOpen(true);
            sendFunnelEvent("cta_click", "check_verification_request_open");
          }}
        >
          {t.open}
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Button>
      ) : (
        <form onSubmit={submit} noValidate className="relative mt-5 grid max-w-xl gap-4">
          <div>
            <label htmlFor={ids.flow} className="block text-[15px] font-semibold">
              {t.flow}
            </label>
            <select ref={flowRef} id={ids.flow} value={flow} onChange={(e) => setFlow(e.target.value)} disabled={busy} className={cn(SELECT, "mt-1")} aria-describedby={error ? ids.error : undefined}>
              <option value="">{t.choose}</option>
              {PRIORITY_FLOWS.map((option) => (
                <option key={option} value={option}>
                  {PRIORITY_FLOW_LABELS[option][locale]}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="text-[15px] font-semibold">{t.paying}</legend>
            <div className="mt-1 grid gap-1">
              {PAYING_OPTIONS.map((option) => (
                <label key={option} className="flex min-h-11 items-center gap-3">
                  <input type="radio" name={ids.paying} value={option} checked={paying === option} onChange={() => setPaying(option)} disabled={busy} className="h-5 w-5 accent-[var(--action)]" />
                  {PAYING_LABELS[option][locale]}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={ids.email} className="block text-[15px] font-semibold">
              {t.email}
            </label>
            <Input id={ids.email} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className="mt-1" />
          </div>
          <div>
            <label htmlFor={ids.app} className="block text-[15px] font-semibold">
              {t.app}
            </label>
            <Input id={ids.app} type="url" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={300} value={app} onChange={(e) => setApp(e.target.value)} disabled={busy} className="mt-1" />
          </div>
          <div>
            <label htmlFor={ids.note} className="block text-[15px] font-semibold">
              {t.note}
            </label>
            <Input id={ids.note} maxLength={VERIFICATION_NOTE_MAX} placeholder={t.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} className="mt-1" />
          </div>
          {/* só robô preenche: fica fora da tela e fora da ordem do Tab */}
          <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label htmlFor={ids.honeypot}>Website</label>
            <input id={ids.honeypot} type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <>
                <PixelLoader />
                {t.sending}
              </>
            ) : (
              t.send
            )}
          </Button>
          <p id={ids.error} role="alert" className={error ? "font-semibold text-critical" : "sr-only"}>
            {error ?? ""}
          </p>
          <p className="text-sm text-muted">{t.privacy}</p>
        </form>
      )}
    </section>
  );
}
