"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PixelIcon, PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { FEEDBACK_LABELS_PT, FEEDBACK_LIVE_APP, FEEDBACK_MESSAGE_MAX, FEEDBACK_VERDICTS } from "@/lib/feedback";
import { apiError, type Locale } from "@/lib/i18n";
import { sendFunnelEvent } from "@/lib/funnel";
import { WAITLIST_EMAIL_RE } from "@/lib/waitlist";

const CHOICE =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line-strong bg-card px-3 py-2 text-[15px] has-[:checked]:border-2 has-[:checked]:border-action has-[:checked]:bg-accent-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]";

const COPY = {
  en: {
    pickVerdict: "Pick how you feel about the proposal.",
    needMessage: "Tell us what you think in a sentence or two.",
    badEmail: "Enter a valid email address, or leave it empty.",
    sendError: "We couldn't send your feedback. Please try again.",
    thanks: "Thank you, it's on its way to Valmir.",
    reply: "If you left your email, expect a personal reply.",
    read: "Every response gets read.",
    form: "Feedback on the proposal",
    verdict: "How do you feel about this proposal?",
    where: "Where would you let it run?",
    optional: "(optional)",
    message: "What would you change, or what would it take for you to trust it?",
    placeholder: "e.g. I'd only trust it if I could see every row it wrote…",
    email: "Email",
    emailHint: "(optional, if you'd like a reply)",
    emailPlaceholder: "you@company.com",
    sending: "Sending…",
    send: "Send feedback",
    note: "Goes straight to the founder's inbox. No account, no newsletter.",
  },
  pt: {
    pickVerdict: "Escolha o que você achou da proposta.",
    needMessage: "Conte o que você acha em uma ou duas frases.",
    badEmail: "Digite um e-mail válido, ou deixe em branco.",
    sendError: "Não conseguimos enviar seu feedback. Tente de novo.",
    thanks: "Obrigado, já está a caminho do Valmir.",
    reply: "Como você deixou seu e-mail, espere uma resposta pessoal.",
    read: "Toda resposta é lida.",
    form: "Feedback sobre a proposta",
    verdict: "O que você achou desta proposta?",
    where: "Onde você deixaria rodar?",
    optional: "(opcional)",
    message: "O que você mudaria, ou o que faria você confiar nele?",
    placeholder: "Ex.: eu só confiaria se pudesse ver cada linha que ele gravou…",
    email: "E-mail",
    emailHint: "(opcional, se quiser resposta)",
    emailPlaceholder: "voce@empresa.com",
    sending: "Enviando…",
    send: "Enviar feedback",
    note: "Vai direto para a caixa de entrada do fundador. Sem conta, sem newsletter.",
  },
} satisfies Record<Locale, unknown>;

/**
 * O feedback sobre a proposta: a reação, onde a pessoa deixaria rodar e o que mudaria.
 * Vai para /api/feedback, que grava no banco e encaminha para copilot@getpublishub.com.
 */
export function FeedbackForm({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale];
  const label = (o: { value: string; label: string }) => (locale === "pt" ? (FEEDBACK_LABELS_PT[o.value] ?? o.label) : o.label);
  const ids = { message: useId(), email: useId(), error: useId(), honeypot: useId(), verdict: useId(), live: useId() };
  const [verdict, setVerdict] = useState("");
  const [liveApp, setLiveApp] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const mountedAt = useRef(0);
  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!verdict) return setError(t.pickVerdict);
    if (!message.trim()) return setError(t.needMessage);
    if (email.trim() && !WAITLIST_EMAIL_RE.test(email.trim())) return setError(t.badEmail);
    setBusy(true);
    setError(null);
    sendFunnelEvent("cta_click", "feedback_submit");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verdict, liveApp: liveApp || undefined, message, email: email.trim() || undefined, website, elapsedMs: Date.now() - mountedAt.current }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: { message?: string; code?: string } };
      if (!response.ok || data.status !== "received") throw new Error(apiError(locale, data.error, t.sendError));
      track("proposal_feedback_sent", { verdict, live_app: liveApp || null, with_email: Boolean(email.trim()) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.sendError);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-md border border-line-strong bg-card p-6 shadow-[6px_6px_0_0_var(--line)] sm:p-8">
        <p ref={doneRef} tabIndex={-1} role="status" className="flex items-start gap-3 text-lg focus:outline-none">
          <PixelIcon name="pass" size={18} className="mt-1 text-success" />
          <span>
            <strong className="font-semibold">{t.thanks}</strong> {email.trim() ? t.reply : t.read}
          </span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label={t.form} className="relative rounded-md border border-line-strong bg-card p-6 shadow-[6px_6px_0_0_var(--line)] sm:p-8">
      <fieldset aria-describedby={error ? ids.error : undefined}>
        <legend id={ids.verdict} className="font-semibold">
          {t.verdict}
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {FEEDBACK_VERDICTS.map((option) => (
            <label key={option.value} className={CHOICE}>
              <input type="radio" name="verdict" value={option.value} checked={verdict === option.value} onChange={() => (setVerdict(option.value), setError(null))} disabled={busy} className="h-4 w-4 accent-[var(--action)]" />
              {label(option)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend id={ids.live} className="font-semibold">
          {t.where} <span className="font-normal text-muted">{t.optional}</span>
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {FEEDBACK_LIVE_APP.map((option) => (
            <label key={option.value} className={CHOICE}>
              <input type="radio" name="liveApp" value={option.value} checked={liveApp === option.value} onChange={() => setLiveApp(option.value)} disabled={busy} className="h-4 w-4 accent-[var(--action)]" />
              {label(option)}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={ids.message} className="mt-6 block font-semibold">
        {t.message}
      </label>
      <textarea
        id={ids.message}
        name="message"
        rows={5}
        maxLength={FEEDBACK_MESSAGE_MAX}
        value={message}
        onChange={(e) => (setMessage(e.target.value), error && setError(null))}
        disabled={busy}
        placeholder={t.placeholder}
        className="mt-1.5 w-full rounded-md border border-line-strong bg-card px-3 py-2 text-base text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface"
      />

      <label htmlFor={ids.email} className="mt-5 block font-semibold">
        {t.email} <span className="font-normal text-muted">{t.emailHint}</span>
      </label>
      <Input
        id={ids.email}
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        placeholder={t.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        className="mt-1.5"
      />

      {/* só robô preenche */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={ids.honeypot}>Website</label>
        <input id={ids.honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <p id={ids.error} role="alert" className={cn(error ? "mt-4 font-semibold text-critical" : "sr-only")}>
        {error}
      </p>

      <Button type="submit" size="lg" disabled={busy} className="mt-6 w-full sm:w-auto">
        {busy ? (
          <>
            <PixelLoader />
            {t.sending}
          </>
        ) : (
          <>
            {t.send}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </Button>
      <p className="mt-3 text-sm text-muted">{t.note}</p>
    </form>
  );
}
