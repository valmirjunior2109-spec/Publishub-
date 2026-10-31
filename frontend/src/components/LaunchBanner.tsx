"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { track } from "@/lib/events";

/**
 * A oferta de lançamento (Product Hunt), numa barra presa embaixo da tela: não
 * mexe no layout do cabeçalho nem do hero.
 *
 * Desligada até existir o cupom no Stripe: sem NEXT_PUBLIC_LAUNCH_CODE nada
 * aparece. E só para quem chegou pelo lançamento (?ref=producthunt ou
 * utm_source=producthunt, lembrado no navegador), até NEXT_PUBLIC_LAUNCH_UNTIL.
 * O desconto em si é do Stripe: o Payment Link precisa aceitar cupom.
 */
const CODE = process.env.NEXT_PUBLIC_LAUNCH_CODE || "";
const PERCENT = process.env.NEXT_PUBLIC_LAUNCH_PERCENT || "40";
const MONTHS = process.env.NEXT_PUBLIC_LAUNCH_MONTHS || "3";
const UNTIL = process.env.NEXT_PUBLIC_LAUNCH_UNTIL || "";
const SOURCE = "producthunt";
const SEEN = "publishub.launch";
const CLOSED = "publishub.launch.closed";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // navegador sem armazenamento: a barra só vale nesta visita
  }
}

function fromLaunchLink(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("ref") === SOURCE || params.get("utm_source") === SOURCE;
}

/** Quem pode ver a barra: oferta ativa, chegou pelo lançamento (agora ou antes) e não fechou. */
function eligible(): boolean {
  if (!CODE) return false;
  if (UNTIL && Date.now() > new Date(UNTIL).getTime()) return false;
  return (fromLaunchLink() || read(SEEN) === "1") && read(CLOSED) !== "1";
}

const noSubscription = () => () => {};

export function LaunchBanner() {
  const t = useTranslations("Launch");
  // no servidor (e na hidratação) não aparece: depende do link e do navegador de quem chegou
  const allowed = useSyncExternalStore(noSubscription, eligible, () => false);
  const [closed, setClosed] = useState(false);

  // lembra que a pessoa veio do lançamento, para a barra seguir nas outras páginas
  useEffect(() => {
    if (CODE && fromLaunchLink()) write(SEEN, "1");
  }, []);

  if (!allowed || closed) return null;

  return (
    <div
      role="region"
      aria-label={t("cta")}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="menu-in flex w-full max-w-[640px] items-center gap-3 rounded-2xl border border-line bg-paper-raised px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug">{t("banner", { percent: PERCENT, months: MONTHS, code: CODE })}</p>
        <Link href="/pricing" onClick={() => track("upgrade_clicked", null, { where: "launch_banner" })} className="shrink-0 text-[13.5px] font-semibold text-accent underline-offset-2 hover:underline">
          {t("cta")}
        </Link>
        <button
          type="button"
          aria-label={t("close")}
          onClick={() => {
            write(CLOSED, "1");
            setClosed(true);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:text-ink"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
