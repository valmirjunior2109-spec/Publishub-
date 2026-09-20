"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import { useErrorText } from "@/lib/useErrorText";
import type { ManusConnection, ManusTask } from "@/lib/types";

interface ManusPanelProps {
  analysisId: string;
  connection: ManusConnection;
  task: ManusTask | null;
  /** Recarrega conexão e tarefa depois de cada ação. */
  onChange: () => void;
}

/**
 * Mandar o plano de ação para o Manus executar.
 *
 * Opcional em todos os sentidos: some da tela quando o servidor não tem a
 * integração, e quem não conecta continua com o plano na tela e o botão de
 * copiar. A chave é do criador, então os créditos que a tarefa gasta são dele.
 */
export function ManusPanel({ analysisId, connection, task, onChange }: ManusPanelProps) {
  const t = useTranslations("Analysis.manus");
  const locale = useLocale();
  const describe = useErrorText();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!connection.available) return null;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await apiFetch("/api/manus/connect", { method: "POST", body: { api_key: key.trim() } });
      setKey("");
    });
  }

  const send = () => run(() => apiFetch(`/api/analyses/${analysisId}/manus`, { method: "POST", body: { ui_locale: locale } }));

  return (
    <section className="mt-12 rounded-md border border-line bg-paper-raised p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="t-label tracking-[0.08em]">{t("eyebrow")}</p>
          <h3 className="mt-2 font-display text-[21px] font-medium leading-tight tracking-tight">{t("title")}</h3>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">{t("lead")}</p>
        </div>
        {connection.connected && <Badge tone="confirmed">{t("connected", { hint: connection.key_hint ?? "" })}</Badge>}
      </div>

      {!connection.connected ? (
        <form onSubmit={connect} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-medium sm:max-w-[360px]">
            {t("keyLabel")}
            <Input type="password" autoComplete="off" placeholder="sk-..." value={key} onChange={(e) => setKey(e.target.value)} disabled={busy} />
          </label>
          <Button type="submit" className="min-h-11" disabled={key.trim().length < 12 || busy}>
            {t("connect")}
          </Button>
        </form>
      ) : task ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={task.task_url ?? "https://manus.im"} target="_blank" rel="noreferrer" className={buttonClasses("primary", "md", "min-h-11")}>
            {t("open")}
            <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
          </a>
          <span className="text-[13px] text-ink-muted">{t(`status.${task.status}` as "status.running")}</span>
          <Button variant="ghost" size="sm" className="min-h-10" disabled={busy} onClick={send}>
            {t("resend")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button className="min-h-11" disabled={busy} onClick={send}>
            {t("send")}
          </Button>
          <span className="text-[12.5px] text-ink-muted">{t("credits")}</span>
        </div>
      )}

      {connection.connected && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => apiFetch("/api/manus/disconnect", { method: "POST" }))}
          className="mt-4 text-[12.5px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {t("disconnect")}
        </button>
      )}

      {!connection.connected && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
          {t("where")}{" "}
          <a href="https://manus.im" target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">
            manus.im
          </a>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-sm border border-refuted bg-paper p-3 text-sm text-refuted">
          {error}
        </p>
      )}
    </section>
  );
}
