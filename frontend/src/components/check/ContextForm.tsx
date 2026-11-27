"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PixelIcon, PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { sendFunnelEvent } from "@/lib/funnel";
import { apiError, type Locale } from "@/lib/i18n";
import { AI_TOOL_LABELS, AI_TOOLS, BUILDING_MAX, PRIORITY_FLOW_LABELS, PRIORITY_FLOWS } from "@/lib/waitlist";

const COPY = {
  en: {
    title: "Help decide what Publishub checks first",
    lead: "Three optional questions. Valmir reads every answer, and it decides which flows the full version learns first.",
    tool: "Which tool did you use to build your app?",
    flow: "Which flow in your app would you most like checked first?",
    building: "In one sentence, what are you building?",
    buildingPlaceholder: "A booking app for dog groomers",
    choose: "Choose one",
    optional: "(optional)",
    send: "Send answers",
    sending: "Sending…",
    empty: "Answer at least one question, or just skip this.",
    error: "We couldn't save your answers. Please try again later.",
    thanks: "Thank you! That helps decide what Publishub checks first.",
  },
  pt: {
    title: "Ajude a decidir o que a Publishub verifica primeiro",
    lead: "Três perguntas opcionais. O Valmir lê todas as respostas, e elas decidem quais fluxos a versão completa aprende primeiro.",
    tool: "Qual ferramenta você usou para criar seu app?",
    flow: "Qual é o fluxo do seu app que você gostaria de ver verificado primeiro?",
    building: "Conte em uma frase o que você está construindo.",
    buildingPlaceholder: "Um app de agendamento para pet shops",
    choose: "Escolha uma",
    optional: "(opcional)",
    send: "Enviar respostas",
    sending: "Enviando…",
    empty: "Responda pelo menos uma pergunta, ou pode pular esta parte.",
    error: "Não conseguimos salvar suas respostas. Tente de novo mais tarde.",
    thanks: "Obrigado! Isso ajuda a decidir o que a Publishub verifica primeiro.",
  },
} satisfies Record<Locale, unknown>;

const SELECT = "min-h-11 w-full rounded-md border border-line-strong bg-card px-3 text-base text-ink disabled:cursor-not-allowed disabled:bg-surface";

/**
 * Para quem já entrou na lista (o /check inscreve pelo e-mail): ferramenta de IA, fluxo prioritário e
 * o que está construindo. Tudo opcional, nada bloqueia nada: o relatório e a inscrição já estão valendo.
 */
export function ContextForm({ refCode, token, locale }: { refCode: string; token: string; locale: Locale }) {
  const t = COPY[locale];
  const ids = { tool: useId(), flow: useId(), building: useId(), error: useId() };
  const [tool, setTool] = useState("");
  const [flow, setFlow] = useState("");
  const [building, setBuilding] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state !== "idle") return;
    if (!tool && !flow && !building.trim()) {
      setError(t.empty);
      return;
    }
    setState("busy");
    setError(null);
    sendFunnelEvent("cta_click", "check_context_submit");
    try {
      const response = await fetch("/api/waitlist/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refCode, token, aiTool: tool || undefined, priorityFlow: flow || undefined, building: building.trim() || undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { saved?: boolean; error?: { message?: string; code?: string } };
      if (!response.ok || !data.saved) throw new Error(apiError(locale, data.error, t.error));
      track("app_check_context_saved", { ai_tool: tool || null, priority_flow: flow || null, building: Boolean(building.trim()) });
      setState("done");
    } catch (err) {
      setError(err instanceof Error && locale === "en" ? err.message : t.error);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="mt-5 flex items-start gap-2 rounded-md border border-line bg-card p-4 font-semibold">
        <PixelIcon name="pass" size={16} className="mt-1 shrink-0 text-success" />
        {t.thanks}
      </p>
    );
  }

  const busy = state === "busy";
  return (
    <form onSubmit={submit} noValidate className="mt-5 rounded-md border border-line bg-card p-4 sm:p-5" aria-labelledby={`${ids.tool}-title`}>
      <h3 id={`${ids.tool}-title`} className="text-lg font-bold">
        {t.title}
      </h3>
      <p className="mt-1 text-sm text-muted">{t.lead}</p>
      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor={ids.tool} className="block text-[15px] font-semibold">
            {t.tool} <span className="font-normal text-muted">{t.optional}</span>
          </label>
          <select id={ids.tool} value={tool} onChange={(e) => setTool(e.target.value)} disabled={busy} className={cn(SELECT, "mt-1")}>
            <option value="">{t.choose}</option>
            {AI_TOOLS.map((option) => (
              <option key={option} value={option}>
                {AI_TOOL_LABELS[option]?.[locale] ?? option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.flow} className="block text-[15px] font-semibold">
            {t.flow} <span className="font-normal text-muted">{t.optional}</span>
          </label>
          <select id={ids.flow} value={flow} onChange={(e) => setFlow(e.target.value)} disabled={busy} className={cn(SELECT, "mt-1")}>
            <option value="">{t.choose}</option>
            {PRIORITY_FLOWS.map((option) => (
              <option key={option} value={option}>
                {PRIORITY_FLOW_LABELS[option][locale]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.building} className="block text-[15px] font-semibold">
            {t.building} <span className="font-normal text-muted">{t.optional}</span>
          </label>
          <Input id={ids.building} maxLength={BUILDING_MAX} placeholder={t.buildingPlaceholder} value={building} onChange={(e) => setBuilding(e.target.value)} disabled={busy} className="mt-1" />
        </div>
      </div>
      <Button type="submit" variant="secondary" disabled={busy} className="mt-4 w-full sm:w-auto" aria-describedby={error ? ids.error : undefined}>
        {busy ? (
          <>
            <PixelLoader />
            {t.sending}
          </>
        ) : (
          t.send
        )}
      </Button>
      <p id={ids.error} role="alert" className={error ? "mt-2 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
    </form>
  );
}
