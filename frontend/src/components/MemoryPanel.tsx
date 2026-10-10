"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Brain, MessageSquareText, NotebookPen, RotateCcw, Scissors, TrendingUp, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useErrorText } from "@/lib/useErrorText";
import { usePolling } from "@/lib/usePolling";
import type { CreatorMemory, CutReason, MemoryItem } from "@/lib/types";

/** Os limites do backend (memory_service): a tela avisa antes, o servidor confere. */
const MAX_NOTES = 20;
const NOTE_MAX_CHARS = 300;
const CUT_REASONS = new Set<string>(["long_pause", "dead_start", "dead_end", "repetition", "hesitation", "pacing", "low_information"]);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Section({ icon, title, lead, children }: { icon: ReactNode; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-md border border-line bg-paper-raised p-6">
      <h2 className="flex items-center gap-2 font-display text-[18px] font-semibold tracking-[-0.02em]">
        <span className="text-accent" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>
      {lead && <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A memória do criador: o que a Publishub aprendeu com a pessoa, e o controle
 * dela sobre isso. Tudo aqui vem do backend (memory_service); a página só mostra
 * e manda os ajustes. Ver, dá para ver sempre; ajustar depende de o servidor já
 * guardar a memória (`stored`).
 */
export function MemoryPanel() {
  const t = useTranslations("Memory");
  const tReasons = useTranslations("Analysis.review.reasonLabel");
  const tKinds = useTranslations("Analysis.plan.kinds");
  const tPace = useTranslations("Analysis.copilot.pace");
  const format = useFormatter();
  const describe = useErrorText();

  const { data, error: loadError } = usePolling<CreatorMemory>("/api/me/memory", { shouldPoll: () => false });
  // cada ajuste devolve a memória inteira de novo: ela passa a valer no lugar da carregada
  const [updated, setUpdated] = useState<CreatorMemory | null>(null);
  const memory = updated ?? data;

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);
  const [forgotten, setForgotten] = useState(false);

  async function run(key: string, path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<boolean> {
    setBusy(key);
    setError(null);
    try {
      setUpdated(await apiFetch<CreatorMemory>(path, { method, body }));
      return true;
    } catch (err) {
      setError(describe(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await run("note", "/api/me/memory/notes", "POST", { text: note })) setNote("");
  }

  async function forget() {
    if (!confirmForget) {
      setConfirmForget(true);
      return;
    }
    if (await run("forget", "/api/me/memory/forget", "POST")) setForgotten(true);
    setConfirmForget(false);
  }

  if (loadError && !memory) {
    return (
      <main className="mx-auto max-w-[760px] px-5 pb-24 pt-8 lg:pt-12">
        <p role="alert" className="rounded-lg border border-refuted bg-paper p-3 text-sm text-refuted">
          {describe(loadError)}
        </p>
      </main>
    );
  }

  if (!memory) {
    return (
      <main className="mx-auto max-w-[760px] px-5 pb-24 pt-8 lg:pt-12" aria-busy="true">
        <div className="h-10 w-2/3 animate-pulse rounded bg-surface" />
        <div className="mt-6 h-32 animate-pulse rounded-md bg-surface" />
      </main>
    );
  }

  const locked = !memory.stored || busy !== null;
  const cutRows = Object.entries(memory.cuts.by_type).filter(([kind]) => kind !== "manual");
  const trajectory = memory.trajectory;
  const stats: [keyof CreatorMemory["stats"], number][] = [
    ["analyses", memory.stats.analyses],
    ["decisions", memory.stats.decisions],
    ["requests", memory.stats.requests],
    ["notes", memory.stats.notes],
  ];

  function hideButton(source: "request" | "missing", item: MemoryItem) {
    return (
      <button
        type="button"
        onClick={() => run(`hide-${item.id}`, "/api/me/memory/hide", "POST", { source, id: item.id })}
        disabled={locked}
        className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
        aria-label={t("remove")}
        title={t("remove")}
      >
        <X size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    );
  }

  function itemList(source: "request" | "missing", items: MemoryItem[]) {
    return (
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-lg border border-line bg-paper px-3.5 py-2.5">
            <p className="min-w-0 flex-1 text-[14px] leading-relaxed">&ldquo;{item.text}&rdquo;</p>
            {item.at && <span className="mt-0.5 shrink-0 text-[12px] tabular-nums text-ink-muted">{format.dateTime(new Date(item.at), { day: "numeric", month: "short" })}</span>}
            {hideButton(source, item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-[760px] px-5 pb-24 pt-8 lg:pt-12">
      <div className="stagger">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[48px]">{t("title")}</h1>
        <p className="mt-4 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-muted">{t("lead")}</p>
        {memory.forgotten_at && (
          <p className="mt-2 text-[13px] text-ink-muted">{t("since", { date: format.dateTime(new Date(memory.forgotten_at), { day: "numeric", month: "long", year: "numeric" }) })}</p>
        )}
      </div>

      {!memory.stored && <p className="mt-6 rounded-lg border border-line bg-paper p-3 text-[13.5px] leading-relaxed text-ink-muted">{t("unavailable")}</p>}

      {/* ---------- ligar ou pausar ---------- */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-paper-raised p-5">
        <div className="min-w-0">
          <p id="memory-toggle-label" className="text-[15px] font-semibold">
            {t("toggle.label")}
          </p>
          {!memory.enabled && <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-muted">{t("toggle.paused")}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={memory.enabled}
          aria-labelledby="memory-toggle-label"
          disabled={locked}
          onClick={() => run("toggle", "/api/me/memory", "PUT", { enabled: !memory.enabled })}
          className="inline-flex items-center gap-2.5 rounded-full text-[13px] font-semibold disabled:opacity-50"
        >
          <span className={cn("relative h-6 w-11 rounded-full transition-colors", memory.enabled ? "bg-accent" : "bg-[rgba(var(--ink-rgb),0.2)]")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-paper-raised shadow transition-[left] duration-150", memory.enabled ? "left-[22px]" : "left-0.5")} />
          </span>
          <span className={memory.enabled ? "text-accent" : "text-ink-muted"}>{memory.enabled ? t("toggle.on") : t("toggle.off")}</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper p-3 text-sm text-refuted">
          {error}
        </p>
      )}
      {forgotten && memory.empty && (
        <p role="status" className="mt-4 rounded-lg border border-line bg-paper p-3 text-sm text-ink-muted">
          {t("forget.done")}
        </p>
      )}

      {/* ---------- o tamanho da memória ---------- */}
      {memory.empty ? (
        <div className="mt-6 rounded-md border border-dashed border-line p-6 text-center">
          <Brain size={28} strokeWidth={1.5} aria-hidden="true" className="mx-auto text-accent" />
          <p className="mt-3 font-display text-[18px] font-semibold tracking-[-0.02em]">{t("empty.title")}</p>
          <p className="mx-auto mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-ink-muted">{t("empty.lead")}</p>
        </div>
      ) : (
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-md border border-line bg-paper-raised p-6 sm:grid-cols-4">
          {stats.map(([key, value]) => (
            <div key={key}>
              <dt className="sr-only">{t(`stats.${key}`, { count: value })}</dt>
              <dd className="font-display text-[32px] font-semibold leading-none tabular-nums tracking-tight">{value}</dd>
              <dd className="mt-1.5 text-[13px] leading-snug text-ink-muted" aria-hidden="true">
                {t(`stats.${key}`, { count: value })}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* ---------- as notas da própria pessoa ---------- */}
      <Section icon={<NotebookPen size={17} strokeWidth={1.75} />} title={t("notes.title")} lead={t("notes.lead")}>
        {memory.notes.length > 0 ? (
          <ul className="mb-4 flex flex-col gap-2">
            {memory.notes.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-lg border border-[rgba(var(--accent-rgb),0.25)] bg-accent-soft px-3.5 py-2.5">
                <p className="min-w-0 flex-1 text-[14px] leading-relaxed">{item.text}</p>
                <button
                  type="button"
                  onClick={() => run(`note-${item.id}`, `/api/me/memory/notes/${item.id}`, "DELETE")}
                  disabled={locked}
                  className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-40"
                  aria-label={t("notes.remove")}
                  title={t("notes.remove")}
                >
                  <X size={15} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-[13.5px] text-ink-muted">{t("notes.none")}</p>
        )}
        <form onSubmit={addNote} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px] font-medium">
            <span className="flex justify-between gap-3">
              {t("notes.label")}
              <span className="font-normal tabular-nums text-ink-muted">{t("notes.count", { count: memory.notes.length, max: MAX_NOTES })}</span>
            </span>
            <Input
              id="memory-note"
              value={note}
              maxLength={NOTE_MAX_CHARS}
              placeholder={t("notes.placeholder")}
              onChange={(event) => setNote(event.target.value)}
              disabled={locked || memory.notes.length >= MAX_NOTES}
            />
          </label>
          <Button type="submit" className="min-h-11" disabled={locked || note.trim().length < 3 || memory.notes.length >= MAX_NOTES}>
            {busy === "note" ? t("notes.adding") : t("notes.add")}
          </Button>
        </form>
      </Section>

      {/* ---------- como a pessoa decide os cortes ---------- */}
      <Section icon={<Scissors size={17} strokeWidth={1.75} />} title={t("cuts.title")} lead={t("cuts.lead")}>
        {cutRows.length === 0 ? (
          <p className="text-[13.5px] text-ink-muted">{t("cuts.none")}</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {cutRows.map(([kind, counts]) => {
              const leaning = memory.cuts.leanings[kind as CutReason];
              return (
                <li key={kind} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
                  {/* no celular o nome fica sozinho na linha; contagem e selo descem juntos */}
                  <p className="w-full min-w-0 text-[14.5px] font-medium sm:w-auto sm:flex-1">{CUT_REASONS.has(kind) ? capitalize(tReasons(kind as "long_pause")) : kind}</p>
                  <p className="mr-auto text-[13px] tabular-nums text-ink-muted sm:mr-0">{t("cuts.counts", { accepted: counts.accepted, rejected: counts.rejected })}</p>
                  <Badge tone={leaning === "accept" ? "accent" : leaning === "reject" ? "ink" : "neutral"}>
                    {leaning ? t(`cuts.${leaning}`) : t("cuts.learning")}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
        {memory.cuts.shortens && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{t("cuts.shortens")}</p>}
      </Section>

      {/* ---------- o que a pessoa pediu, e o que sentiu falta ---------- */}
      <Section icon={<MessageSquareText size={17} strokeWidth={1.75} />} title={t("requests.title")} lead={t("requests.lead")}>
        {memory.requests.length > 0 ? itemList("request", memory.requests) : <p className="text-[13.5px] text-ink-muted">{t("requests.none")}</p>}
      </Section>

      {memory.missing.length > 0 && (
        <Section icon={<MessageSquareText size={17} strokeWidth={1.75} />} title={t("missing.title")} lead={t("missing.lead")}>
          {itemList("missing", memory.missing)}
        </Section>
      )}

      {/* ---------- a trajetória dos vídeos ---------- */}
      {trajectory.analyses > 0 && (
        <Section icon={<TrendingUp size={17} strokeWidth={1.75} />} title={t("trajectory.title")}>
          {trajectory.hook_scores.length > 0 && (
            <>
              <p className="t-label">{t("trajectory.hooks")}</p>
              <ol className="mt-2 flex flex-wrap items-center gap-1.5">
                {trajectory.hook_scores.map((score, index) => {
                  const latest = index === trajectory.hook_scores.length - 1;
                  return (
                    <li key={index} className="flex items-center gap-1.5">
                      {index > 0 && <span aria-hidden="true" className="text-ink-muted">→</span>}
                      <span className={cn("rounded-md px-2 py-1 text-[14px] font-semibold tabular-nums", latest ? "bg-accent text-on-accent" : "bg-surface text-ink")}>{score}</span>
                    </li>
                  );
                })}
              </ol>
              {trajectory.hook_average !== null && <p className="mt-3 text-[13.5px] text-ink-muted">{t("trajectory.average", { score: trajectory.hook_average })}</p>}
            </>
          )}
          <div className="mt-3 flex flex-col gap-1.5 text-[14px] leading-relaxed">
            {trajectory.hook_trend && <p>{t(`trajectory.${trajectory.hook_trend}`)}</p>}
            {trajectory.recurring_fronts.length > 0 && <p>{t("trajectory.recurring", { list: trajectory.recurring_fronts.map((kind) => tKinds(kind)).join(", ") })}</p>}
            {trajectory.usual_pace && <p>{t("trajectory.pace", { pace: tPace(trajectory.usual_pace).toLowerCase() })}</p>}
            {trajectory.analyses < 3 && <p className="text-[13.5px] text-ink-muted">{t("trajectory.few")}</p>}
          </div>
        </Section>
      )}

      {/* ---------- esquecer: recomeçar do zero, sem apagar análises ---------- */}
      {!memory.empty && (
        <section className="mt-6 rounded-md border border-line bg-paper-raised p-6">
          <h2 className="flex items-center gap-2 font-display text-[18px] font-semibold tracking-[-0.02em]">
            <RotateCcw size={17} strokeWidth={1.75} aria-hidden="true" className="text-ink-muted" />
            {t("forget.title")}
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">{t("forget.lead")}</p>
          <Button
            variant="secondary"
            className={cn("mt-4 min-h-11", confirmForget && "border-refuted text-refuted")}
            onClick={forget}
            onBlur={() => setConfirmForget(false)}
            disabled={locked}
          >
            {confirmForget ? t("forget.confirm") : t("forget.cta")}
          </Button>
        </section>
      )}
    </main>
  );
}
