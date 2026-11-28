"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PixelIcon, PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { deleteTokenKey } from "@/lib/check/types";
import { sendFunnelEvent } from "@/lib/funnel";
import { apiError, type Locale } from "@/lib/i18n";
import { WAITLIST_EMAIL_RE } from "@/lib/waitlist";

const COPY = {
  en: {
    badge: "New · Free during the beta",
    title: (host: string) => `Check ${host} every day`,
    text: "Every day Publishub runs this same check on your public pages and emails you only when a NEW problem shows up, compared with the previous day. Nothing that was already broken gets repeated.",
    scope: "Public pages only, read-only, like this check. Flows behind a login aren't covered yet.",
    email: "Email for the alerts",
    submit: "Turn on daily check",
    sending: "Turning on…",
    badEmail: "Enter a valid email address, like you@company.com.",
    error: "We couldn't turn on the monitor. Please try again.",
    pending: (email: string) => `Almost there: confirm in the email we sent to ${email}.`,
    pendingNoMail: "Almost there: we'll email you a confirmation link.",
    pendingHint: "The monitor only starts after you confirm, so no one can sign up someone else's email.",
    active: "This app is already monitored for this email. You'll hear from us when something new breaks.",
  },
  pt: {
    badge: "Novo · Grátis durante o beta",
    title: (host: string) => `Verificar ${host} todo dia`,
    text: "Todo dia a Publishub roda este mesmo teste nas suas páginas públicas e te avisa por e-mail só quando aparece um problema NOVO, comparado com o dia anterior. O que já estava quebrado não se repete.",
    scope: "Só páginas públicas, só leitura, como este teste. Fluxos com login ainda não entram.",
    email: "E-mail para os alertas",
    submit: "Ligar verificação diária",
    sending: "Ligando…",
    badEmail: "Digite um e-mail válido, como voce@empresa.com.",
    error: "Não conseguimos ligar o monitor. Tente de novo.",
    pending: (email: string) => `Quase lá: confirme no e-mail que enviamos para ${email}.`,
    pendingNoMail: "Quase lá: vamos te mandar um link de confirmação por e-mail.",
    pendingHint: "O monitor só começa depois da confirmação, para ninguém cadastrar o e-mail de outra pessoa.",
    active: "Este app já é monitorado para este e-mail. Você recebe um aviso quando algo novo quebrar.",
  },
} satisfies Record<Locale, unknown>;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * O monitor contínuo, oferecido no relatório: só para quem criou o teste (o token de apagar está neste navegador),
 * porque o monitor usa este relatório como a primeira base de comparação. Liga depois da confirmação por e-mail.
 */
export function MonitorOffer({ checkId, appUrl, locale }: { checkId: string; appUrl: string; locale: Locale }) {
  const t = COPY[locale];
  const ids = { email: useId(), error: useId(), honeypot: useId() };
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "pending" | "active">("idle");
  const [emailed, setEmailed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedAt = useRef(0);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
    const timer = setTimeout(() => {
      try {
        setToken(window.localStorage.getItem(deleteTokenKey(checkId)));
      } catch {
        setToken(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [checkId]);

  useEffect(() => {
    if (state === "pending" || state === "active") statusRef.current?.focus();
  }, [state]);

  if (!token) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "busy") return;
    if (!WAITLIST_EMAIL_RE.test(email.trim())) {
      setError(t.badEmail);
      return;
    }
    setState("busy");
    setError(null);
    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkId, token, email: email.trim(), locale, website, elapsedMs: Date.now() - mountedAt.current }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; emailed?: boolean; error?: { message?: string; code?: string } };
      if (!response.ok || (data.status !== "pending" && data.status !== "active")) throw new Error(apiError(locale, data.error, t.error));
      sendFunnelEvent("cta_click", "check_monitor_on");
      track("monitor_requested", { status: data.status });
      setEmailed(data.emailed !== false);
      setState(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setState("idle");
    }
  }

  const busy = state === "busy";

  return (
    <section aria-labelledby={`${ids.email}-title`} className="rounded-md border-2 border-success bg-card p-5 sm:p-8">
      <p className="flex items-center gap-2 font-pixel text-sm text-success">
        <BellRing aria-hidden="true" className="h-4 w-4" />
        {t.badge}
      </p>
      <h2 id={`${ids.email}-title`} className="mt-2 break-words text-2xl font-bold sm:text-3xl">
        {t.title(hostOf(appUrl))}
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.text}</p>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t.scope}</p>

      {state === "pending" || state === "active" ? (
        <div className="mt-5 rounded-md border border-line bg-surface p-4">
          <p ref={statusRef} tabIndex={-1} role="status" className="flex items-start gap-2 text-lg font-semibold focus:outline-none">
            <PixelIcon name="pass" size={16} className="mt-1.5 shrink-0 text-success" />
            {state === "active" ? t.active : emailed ? t.pending(email.trim()) : t.pendingNoMail}
          </p>
          {state === "pending" && <p className="mt-1 text-muted">{t.pendingHint}</p>}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="relative mt-5 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor={ids.email} className="block text-[15px] font-semibold">
              {t.email}
            </label>
            <Input
              id={ids.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ids.error : undefined}
              className="mt-1"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <>
                <PixelLoader />
                {t.sending}
              </>
            ) : (
              t.submit
            )}
          </Button>
          {/* só robô preenche: fica fora da tela e fora da ordem do Tab */}
          <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label htmlFor={ids.honeypot}>Website</label>
            <input id={ids.honeypot} type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </form>
      )}
      <p id={ids.error} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
    </section>
  );
}
