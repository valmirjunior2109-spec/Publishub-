"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApiErrorHandler } from "@/lib/useApiErrorHandler";
import { useErrorText } from "@/lib/useErrorText";
import { usePolling } from "@/lib/usePolling";
import type { NotionStatus, NotionTarget } from "@/lib/types";

/** Onde voltar depois de autorizar no Notion: o Notion só devolve o `state`, não a tela. */
export const RETURN_KEY = "publishub.notion.return";

interface NotionSendProps {
  analysisId: string;
}

/**
 * "Enviar para o Notion": a análise inteira vira uma página no Notion de quem
 * editou — nome do vídeo, notas, queda, plano de ação, cortes e ganchos.
 *
 * Três passos, um por vez: conectar a conta, escolher onde as análises caem e
 * enviar. Sem a integração configurada no servidor, nada disso aparece.
 */
export function NotionSend({ analysisId }: NotionSendProps) {
  const t = useTranslations("Analysis.notion");
  const describe = useErrorText();
  const handleApiError = useApiErrorHandler();

  // o estado vem do backend; `fresh` é o que acabou de mudar nesta tela
  const { data, reload } = usePolling<NotionStatus>(`/api/analyses/${analysisId}/notion`, { shouldPoll: () => false });
  const [fresh, setFresh] = useState<Partial<NotionStatus> | null>(null);
  const [targets, setTargets] = useState<NotionTarget[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<"connect" | "targets" | "save" | "send" | null>(null);
  const [chosen, setChosen] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function run<T>(what: NonNullable<typeof busy>, call: () => Promise<T>): Promise<T | null> {
    setBusy(what);
    setError(null);
    try {
      return await call();
    } catch (err) {
      if (!(await handleApiError(err as ApiError))) setError(describe(err));
      return null;
    } finally {
      setBusy(null);
    }
  }

  /** Manda a pessoa autorizar no Notion, guardando para onde ela volta. */
  async function connect() {
    const response = await run("connect", () => apiFetch<{ url: string }>("/api/notion/authorize"));
    if (!response) return;
    try {
      window.localStorage.setItem(RETURN_KEY, window.location.pathname);
    } catch {
      // sem localStorage a volta cai no dashboard, e a conexão continua feita
    }
    window.location.href = response.url;
  }

  async function loadTargets() {
    const response = await run("targets", () => apiFetch<{ targets: NotionTarget[] }>("/api/notion/targets"));
    if (response) setTargets(response.targets);
  }

  function openPicker() {
    setPicking(true);
    if (!targets) void loadTargets();
  }

  async function saveTarget() {
    const target = (targets ?? []).find((item) => item.id === chosen);
    if (!target) return;
    const response = await run("save", () =>
      apiFetch<NotionStatus>("/api/notion/target", { method: "POST", body: { target_type: target.type, target_id: target.id, target_title: target.title } }),
    );
    if (!response) return;
    setFresh((current) => ({ ...current, connection: response.connection }));
    setPicking(false);
    reload();
  }

  async function send() {
    const response = await run("send", () => apiFetch<{ export: { page_url: string; created_at: string | null } }>(`/api/analyses/${analysisId}/notion`, { method: "POST" }));
    if (response) setFresh((current) => ({ ...current, export: response.export }));
  }

  // integração desligada no servidor, ou ainda carregando: nada a mostrar
  if (!data?.configured) return null;

  const connection = fresh?.connection ?? data.connection;
  const exported = fresh?.export ?? data.export ?? null;

  return (
    <section className="mt-16 rounded-md border border-line bg-paper-raised p-7">
      <p className="t-label tracking-[0.08em]">{t("label")}</p>
      <h2 className="mt-2 font-display text-[22px] font-medium leading-tight tracking-[-0.01em]">{t("title")}</h2>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">{t("lead")}</p>

      {/* 1. conectar a conta */}
      {!connection && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button className="min-h-11" onClick={connect} disabled={busy === "connect"}>
            {busy === "connect" ? t("connecting") : t("connect")}
          </Button>
          <p className="text-[13px] text-ink-muted">{t("connectNote")}</p>
        </div>
      )}

      {connection && (
        <>
          <p className="mt-5 flex flex-wrap items-center gap-2 text-[13.5px]">
            <Check size={14} strokeWidth={2.5} aria-hidden="true" className="text-confirmed" />
            {connection.workspace_name ? t("connectedTo", { workspace: connection.workspace_name }) : t("connected")}
            {connection.target_title && <span className="text-ink-muted">· {t("target", { target: connection.target_title })}</span>}
          </p>

          {/* 2. escolher o destino */}
          {(picking || !connection.target_id) && (
            <div className="mt-5 rounded-sm border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13.5px] font-medium">{t("chooseTitle")}</p>
                <button
                  type="button"
                  onClick={loadTargets}
                  disabled={busy === "targets"}
                  className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                >
                  <RefreshCw size={13} strokeWidth={1.75} aria-hidden="true" className={cn(busy === "targets" && "animate-spin")} />
                  {t("refresh")}
                </button>
              </div>

              {targets === null && busy === "targets" && <p className="mt-3 text-[13px] text-ink-muted">{t("loadingTargets")}</p>}
              {targets !== null && targets.length === 0 && <p className="mt-3 text-[13px] text-ink-muted">{t("noTargets")}</p>}

              {targets !== null && targets.length > 0 && (
                <>
                  <ul className="mt-3 flex max-h-[240px] flex-col overflow-y-auto">
                    {targets.map((target) => (
                      <li key={target.id}>
                        <label className="flex cursor-pointer items-center gap-3 border-t border-line py-2.5 text-[14px] first:border-t-0">
                          <input type="radio" name="notion-target" value={target.id} checked={chosen === target.id} onChange={() => setChosen(target.id)} className="accent-ink" />
                          <span className="min-w-0 flex-1 truncate">
                            {target.icon ? `${target.icon} ` : ""}
                            {target.title}
                          </span>
                          <span className="shrink-0 text-[12px] uppercase tracking-[0.04em] text-ink-muted">{t(target.type === "page" ? "kindPage" : "kindDatabase")}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Button className="min-h-11" onClick={saveTarget} disabled={!chosen || busy === "save"}>
                      {busy === "save" ? t("saving") : t("save")}
                    </Button>
                    {connection.target_id && (
                      <button type="button" onClick={() => setPicking(false)} className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                        {t("cancel")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. enviar */}
          {connection.target_id && !picking && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button className="min-h-11" onClick={send} disabled={busy === "send"}>
                {busy === "send" ? t("sending") : exported ? t("sendAgain") : t("send")}
              </Button>
              {exported && (
                <a href={exported.page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                  {t("open")}
                  <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                </a>
              )}
              <button type="button" onClick={openPicker} className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                {t("change")}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-5 rounded-sm border border-refuted bg-paper p-3 text-[13.5px] text-refuted">
          {error}
        </p>
      )}
    </section>
  );
}
