"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PixelIcon, PixelLoader } from "@/components/ui/Pixel";
import { track } from "@/lib/analytics";
import { apiError, localePath, type Locale } from "@/lib/i18n";

const COPY = {
  en: {
    confirmTitle: "Turn on the daily check?",
    confirmText: "Every day Publishub will check the public pages of your app and email you only when a new problem shows up.",
    confirm: "Yes, turn it on",
    stopTitle: "Stop the daily check?",
    stopText: "You won't get any more emails about this app. You can turn it on again from a new check.",
    stop: "Stop the monitor",
    busy: "One moment…",
    active: (host: string) => `The daily check of ${host} is on. We'll email you when something new breaks.`,
    stopped: (host: string) => `The daily check of ${host} is off.`,
    error: "We couldn't update the monitor. Please try again.",
    check: "Run a check now",
  },
  pt: {
    confirmTitle: "Ligar a verificação diária?",
    confirmText: "Todo dia a Publishub vai verificar as páginas públicas do seu app e te avisar por e-mail só quando aparecer um problema novo.",
    confirm: "Sim, ligar",
    stopTitle: "Parar a verificação diária?",
    stopText: "Você não vai receber mais e-mails sobre este app. Dá para ligar de novo a partir de um novo teste.",
    stop: "Parar o monitor",
    busy: "Um momento…",
    active: (host: string) => `A verificação diária de ${host} está ligada. Avisamos por e-mail quando algo novo quebrar.`,
    stopped: (host: string) => `A verificação diária de ${host} está desligada.`,
    error: "Não conseguimos atualizar o monitor. Tente de novo.",
    check: "Fazer um teste agora",
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
 * Confirmar ou parar o monitor, com um clique da pessoa: os links do e-mail só abrem esta página, para o
 * pré-carregamento de links de alguns e-mails não ligar nem desligar nada sozinho.
 */
export function MonitorAction({ id, token, action, locale }: { id: string; token: string; action: "confirm" | "stop"; locale: Locale }) {
  const t = COPY[locale];
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [result, setResult] = useState<{ status: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("busy");
    setError(null);
    try {
      const response = await fetch(`/api/monitors/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, token }) });
      const data = (await response.json().catch(() => ({}))) as { status?: string; url?: string; error?: { message?: string; code?: string } };
      if (!response.ok || !data.status) throw new Error(apiError(locale, data.error, t.error));
      track(action === "confirm" ? "monitor_confirmed" : "monitor_stopped", {});
      setResult({ status: data.status, url: data.url ?? "" });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setState("idle");
    }
  }

  if (state === "done" && result) {
    const host = hostOf(result.url);
    return (
      <div role="status" className="rounded-md border border-line-strong bg-card p-6">
        <p className="flex items-start gap-2 text-lg font-semibold">
          <PixelIcon name="pass" size={16} className="mt-1.5 shrink-0 text-success" />
          {result.status === "active" ? t.active(host) : result.status === "stopped" ? t.stopped(host) : t.error}
        </p>
        <Link href={localePath(locale, "/check")} className="mt-4 inline-flex min-h-11 items-center font-semibold">
          {t.check}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line-strong bg-card p-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{action === "confirm" ? t.confirmTitle : t.stopTitle}</h1>
      <p className="mt-3 text-lg text-muted">{action === "confirm" ? t.confirmText : t.stopText}</p>
      <Button size="lg" variant={action === "confirm" ? "primary" : "secondary"} onClick={() => void run()} disabled={state === "busy"} className="mt-5 w-full sm:w-auto">
        {state === "busy" ? (
          <>
            <PixelLoader />
            {t.busy}
          </>
        ) : action === "confirm" ? (
          t.confirm
        ) : (
          t.stop
        )}
      </Button>
      <p role="alert" className={error ? "mt-3 font-semibold text-critical" : "sr-only"}>
        {error ?? ""}
      </p>
    </div>
  );
}
