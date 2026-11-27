"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PixelIcon, PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { conversionContext } from "@/lib/attribution";
import { attribution, sendFunnelEvent } from "@/lib/funnel";
import { PRICING_ANCHOR } from "@/lib/founding";
import { apiError, localePath, type Locale } from "@/lib/i18n";
import { AI_TOOL_LABELS, AI_TOOLS, BUILDING_MAX, PRIORITY_FLOW_LABELS, PRIORITY_FLOWS, WAITLIST_EMAIL_RE, type WaitlistForm as FormName } from "@/lib/waitlist";
import { setJoined, useJoined } from "./joined";
import { ShareBox } from "./ShareBox";

const COPY = {
  en: {
    invalid: "Enter a valid email address, like you@company.com.",
    empty: "Enter your email address.",
    saveError: "We couldn't save your email. Please try again.",
    joined: "You're on the list!",
    already: "You're already on the list.",
    position: (n: string) => (
      <>
        You&apos;re <strong className="font-semibold">#{n}</strong> in line. We invite people in batches, starting from the top.
      </>
    ),
    notify: "We'll notify you as soon as Publishub early access opens.",
    skip: "Want to skip the line?",
    skipText: "Founding Customers skip the line, get their flows set up 1:1 by the founder, and lock in the founding price. $0 today: nothing is charged before launch.",
    become: "Become a Founding Customer",
    name: "Name",
    optional: "(optional)",
    tool: "Which tool did you use to build your app?",
    choose: "Choose one",
    flow: "Which flow in your app would you most like checked first?",
    building: "In one sentence, what are you building?",
    buildingPlaceholder: "A booking app for dog groomers",
    app: "Your app's URL",
    emailLabel: "Email address",
    joining: "Joining…",
    more: "Add your name, AI tool, app and what to check first (optional)",
    formInline: "Join the waitlist",
    formStacked: "Get early access",
    noteInline: (
      <>
        Free to join · Only early-access emails · Unsubscribe anytime · <a href="/privacy">Privacy</a>
      </>
    ),
    noteStacked: (
      <>
        Free to join. We&apos;ll only email you about Publishub early access, and you can unsubscribe anytime. <a href="/privacy">Privacy policy</a>.
      </>
    ),
    placeholder: "you@company.com",
  },
  pt: {
    invalid: "Digite um e-mail válido, como voce@empresa.com.",
    empty: "Digite seu e-mail.",
    saveError: "Não conseguimos salvar seu e-mail. Tente de novo.",
    joined: "Você está na lista!",
    already: "Você já está na lista.",
    position: (n: string) => (
      <>
        Você é o <strong className="font-semibold">#{n}</strong> da fila. Convidamos as pessoas em grupos, começando pelo topo.
      </>
    ),
    notify: "Avisamos assim que o acesso antecipado ao Publishub abrir.",
    skip: "Quer furar a fila?",
    skipText: "Founding Customers passam na frente, têm os fluxos configurados 1:1 pelo fundador e garantem o preço de fundador. US$ 0 hoje: nada é cobrado antes do lançamento.",
    become: "Quero ser Founding Customer",
    name: "Nome",
    optional: "(opcional)",
    tool: "Qual ferramenta você usou para criar seu app?",
    choose: "Escolha uma",
    flow: "Qual é o fluxo do seu app que você gostaria de ver verificado primeiro?",
    building: "Conte em uma frase o que você está construindo.",
    buildingPlaceholder: "Um app de agendamento para pet shops",
    app: "URL do seu app",
    emailLabel: "E-mail",
    joining: "Entrando…",
    more: "Adicionar nome, ferramenta de IA, app e o que verificar primeiro (opcional)",
    formInline: "Entrar na lista de espera",
    formStacked: "Acesso antecipado",
    noteInline: (
      <>
        Grátis · Só e-mails sobre o acesso antecipado · Saia quando quiser · <a href="/privacy">Privacidade</a>
      </>
    ),
    noteStacked: (
      <>
        Grátis. Só mandamos e-mails sobre o acesso antecipado ao Publishub, e você pode sair quando quiser. <a href="/privacy">Política de privacidade (em inglês)</a>.
      </>
    ),
    placeholder: "voce@empresa.com",
  },
} satisfies Record<Locale, unknown>;

const SELECT =
  "min-h-11 w-full rounded-md border border-line-strong bg-card px-3 text-base text-ink disabled:cursor-not-allowed disabled:bg-surface";

/**
 * A inscrição na lista de espera. Só o e-mail é obrigatório; nome, ferramenta de IA e a URL do app são
 * opcionais (no formulário do topo, ficam num <details> para não pesar). O sucesso só aparece depois que
 * o servidor confirma a linha gravada, com a posição na fila e o link pessoal de indicação.
 */
export function WaitlistForm({
  form,
  submitLabel,
  layout,
  defaultAppUrl = "",
  locale = "en",
}: {
  form: FormName;
  submitLabel: string;
  layout: "inline" | "stacked";
  defaultAppUrl?: string;
  locale?: Locale;
}) {
  const t = COPY[locale];
  const ids = { email: useId(), name: useId(), tool: useId(), flow: useId(), building: useId(), app: useId(), error: useId(), note: useId(), honeypot: useId() };
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tool, setTool] = useState("");
  const [flow, setFlow] = useState("");
  const [building, setBuilding] = useState("");
  const [appUrl, setAppUrl] = useState(defaultAppUrl);
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
      setError(value ? t.invalid : t.empty);
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: value,
          name,
          aiTool: tool || undefined,
          appUrl: appUrl.trim() || undefined,
          priorityFlow: flow || undefined,
          building: building.trim() || undefined,
          form,
          website,
          elapsedMs: Date.now() - mountedAt.current,
          ...attribution(),
          ...conversionContext(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        status?: string;
        refCode?: string | null;
        position?: number | null;
        referrals?: number;
        contextToken?: string | null;
        error?: { message?: string; code?: string };
      };
      if (!response.ok || (data.status !== "joined" && data.status !== "duplicate")) {
        throw new Error(apiError(locale, data.error, t.saveError));
      }
      if (data.status === "joined") track("waitlist_joined", { form, ai_tool: tool || null, priority_flow: flow || null, referred: Boolean(attribution().ref), ...attribution().utm });
      setSubmittedHere(true);
      setJoined({ status: data.status, refCode: data.refCode ?? null, position: data.position ?? null, referrals: data.referrals ?? 0, contextToken: data.contextToken ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
      setBusy(false);
      emailRef.current?.focus();
    }
  }

  if (joined) {
    return (
      <div className="rounded-md border border-line-strong bg-card p-5 text-left shadow-[5px_5px_0_0_var(--line)] sm:p-6">
        <p ref={doneRef} tabIndex={-1} role="status" className="flex items-start gap-3 text-lg focus:outline-none">
          <PixelIcon name="pass" size={18} className="mt-1 text-success" />
          <span>
            <strong className="font-semibold">{joined.status === "joined" ? t.joined : t.already}</strong>{" "}
            {joined.position ? (
              t.position(joined.position.toLocaleString(locale === "pt" ? "pt-BR" : "en-US"))
            ) : (
              <>{t.notify}</>
            )}
          </span>
        </p>
        {/* logo depois de entrar na lista é quando a pessoa mais quer o produto: a oferta Founding vem aqui.
            No /check o relatório já tem o próprio card Founding, então ela não se repete. */}
        {form !== "check" && (
          <div className="mt-5 border-l-4 border-action bg-accent-soft px-4 py-3">
            <p className="font-semibold">{t.skip}</p>
            <p className="mt-1 text-[15px]">{t.skipText}</p>
            <a
              href={localePath(locale, `/#${PRICING_ANCHOR}`)}
              onClick={() => sendFunnelEvent("cta_click", `${form}_success_founding`)}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold"
            >
              {t.become}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        )}
        <ShareBox refCode={joined.refCode} referrals={joined.referrals} locale={locale} />
      </div>
    );
  }

  const optional = (
    <div className={cn("grid gap-4", layout === "inline" && "mt-3 sm:grid-cols-2")}>
      <div>
        <label htmlFor={ids.name} className="block text-[15px] font-semibold">
          {t.name} <span className="font-normal text-muted">{t.optional}</span>
        </label>
        <Input id={ids.name} name="name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} className="mt-1" />
      </div>
      <div>
        <label htmlFor={ids.tool} className="block text-[15px] font-semibold">
          {t.tool} <span className="font-normal text-muted">{t.optional}</span>
        </label>
        <select id={ids.tool} name="aiTool" value={tool} onChange={(e) => setTool(e.target.value)} disabled={busy} className={cn(SELECT, "mt-1")}>
          <option value="">{t.choose}</option>
          {AI_TOOLS.map((option) => (
            <option key={option} value={option}>
              {AI_TOOL_LABELS[option]?.[locale] ?? option}
            </option>
          ))}
        </select>
      </div>
      <div className={cn(layout === "inline" && "sm:col-span-2")}>
        <label htmlFor={ids.flow} className="block text-[15px] font-semibold">
          {t.flow} <span className="font-normal text-muted">{t.optional}</span>
        </label>
        <select id={ids.flow} name="priorityFlow" value={flow} onChange={(e) => setFlow(e.target.value)} disabled={busy} className={cn(SELECT, "mt-1")}>
          <option value="">{t.choose}</option>
          {PRIORITY_FLOWS.map((option) => (
            <option key={option} value={option}>
              {PRIORITY_FLOW_LABELS[option][locale]}
            </option>
          ))}
        </select>
      </div>
      <div className={cn(layout === "inline" && "sm:col-span-2")}>
        <label htmlFor={ids.building} className="block text-[15px] font-semibold">
          {t.building} <span className="font-normal text-muted">{t.optional}</span>
        </label>
        <Input
          id={ids.building}
          name="building"
          maxLength={BUILDING_MAX}
          placeholder={t.buildingPlaceholder}
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          disabled={busy}
          className="mt-1"
        />
      </div>
      <div className={cn(layout === "inline" && "sm:col-span-2")}>
        <label htmlFor={ids.app} className="block text-[15px] font-semibold">
          {t.app} <span className="font-normal text-muted">{t.optional}</span>
        </label>
        <Input
          id={ids.app}
          name="appUrl"
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={300}
          placeholder="myapp.vercel.app"
          value={appUrl}
          onChange={(e) => setAppUrl(e.target.value)}
          disabled={busy}
          className="mt-1"
        />
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
    placeholder: t.placeholder,
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
    <form onSubmit={submit} noValidate className="relative text-left" aria-label={layout === "inline" ? t.formInline : t.formStacked}>
      {layout === "inline" ? (
        <>
          {/* no topo: campo e botão numa caixa só; o rótulo fica para o leitor de tela e o placeholder mostra o formato */}
          <label htmlFor={ids.email} className="sr-only">
            {t.emailLabel}
          </label>
          <div
            className={cn(
              "flex flex-col gap-2 rounded-md border bg-card p-2 shadow-[5px_5px_0_0_var(--line)] transition-colors sm:flex-row sm:items-center",
              "focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--focus)]",
              error ? "border-2 border-critical focus-within:outline-critical" : "border-line-strong",
            )}
          >
            <input
              {...emailProps}
              className="min-h-12 w-full min-w-0 flex-1 rounded-sm bg-transparent px-3 text-base text-ink placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed"
            />
            <Button type="submit" size="lg" disabled={busy} className="rounded-sm sm:min-w-[11.5rem]">
              {busy ? (
                <>
                  <PixelLoader />
                  {t.joining}
                </>
              ) : (
                submitLabel
              )}
              {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </Button>
          </div>
        </>
      ) : (
        <>
          <label htmlFor={ids.email} className="block text-[15px] font-semibold">
            {t.emailLabel}
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
            {t.more}
          </summary>
          {optional}
        </details>
      ) : (
        <div className="mt-4">{optional}</div>
      )}

      {layout === "stacked" ? (
        <Button type="submit" size="lg" disabled={busy} className="mt-5 w-full">
          {busy ? (
            <>
              <PixelLoader />
              {t.joining}
            </>
          ) : (
            submitLabel
          )}
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
        {layout === "inline" ? t.noteInline : t.noteStacked}
      </p>
    </form>
  );
}
