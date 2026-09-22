"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { Clapperboard, Gem, Handshake, LogOut, Menu, Plus, Settings, Target, X } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { clearReferralCookie, readReferralCookie } from "@/lib/referral";
import { supportMailto } from "@/lib/support";
import { signOut as encerrarSessao } from "@/lib/supabase";
import { usePolling } from "@/lib/usePolling";
import type { Accuracy, Me } from "@/lib/types";

interface AppShellProps {
  session: Session;
  children: ReactNode;
}

function initialOf(name: string | undefined, email: string | undefined): string {
  return (name || email || "?").trim().charAt(0).toUpperCase() || "?";
}

function NavItem({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-[14px] transition-[background-color,color,transform] duration-200 hover:translate-x-0.5 hover:no-underline",
        active ? "nav-active bg-paper font-medium text-ink" : "text-ink-muted hover:bg-paper hover:text-ink",
      )}
    >
      <span className={cn("transition-colors", active ? "text-accent" : "text-ink-muted")}>{icon}</span>
      {label}
    </Link>
  );
}

/** O conteúdo do painel lateral — o mesmo no desktop (fixo) e no celular (gaveta). */
function Panel({ session, onNavigate }: { session: Session; onNavigate?: () => void }) {
  const t = useTranslations("Shell");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const { data: accuracy } = usePolling<Accuracy>("/api/accuracy", { shouldPoll: () => false });
  const { data: me } = usePolling<Me>("/api/me", { shouldPoll: () => false });
  const tb = useTranslations("Billing");
  const user = session.user;
  const plan = me?.entitlement;
  const lifetime = plan?.plan === "lifetime";
  // o que acaba primeiro é a análise completa, não o upload: é isso que a barra mostra
  const freeLeft = plan && !lifetime ? plan.free_analyses_remaining : null;
  const nearLimit = freeLeft !== null && freeLeft !== undefined && freeLeft <= 1;
  const name: string | undefined = user.user_metadata?.full_name || undefined;

  async function signOut() {
    await encerrarSessao();
    router.push("/");
  }

  const items = [
    { href: "/dashboard", icon: <Clapperboard size={18} strokeWidth={1.75} />, label: t("analyses"), active: pathname === "/dashboard" || pathname.startsWith("/results/") },
    { href: "/nova-analise", icon: <Plus size={18} strokeWidth={1.75} />, label: t("newAnalysis"), active: pathname === "/nova-analise" },
    { href: "/planos", icon: <Gem size={18} strokeWidth={1.75} />, label: t("plan"), active: pathname === "/planos" },
    { href: "/partners", icon: <Handshake size={18} strokeWidth={1.75} />, label: t("partners"), active: pathname === "/partners" },
    { href: "/conta", icon: <Settings size={18} strokeWidth={1.75} />, label: tCommon("account"), active: pathname === "/conta" },
  ];

  return (
    <div className="flex h-full flex-col" onClick={onNavigate}>
      <Link href="/dashboard" className="flex items-center px-3 hover:no-underline">
        <Logo size="md" label={tCommon("brand")} />
      </Link>

      <nav className="stagger mt-9 flex flex-col gap-1" aria-label={t("menu")}>
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* plano: o contador de uploads grátis vem do backend; aqui só se mostra */}
      {plan && (
        <div className="mt-8 rounded-md border border-line bg-paper p-4 fade-in" style={{ animationDelay: "200ms" }}>
          <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">
            <Gem size={14} strokeWidth={1.75} className={lifetime ? "text-accent" : "text-ink-muted"} />
            {tb(lifetime ? "lifetime" : "free")}
          </p>
          {lifetime ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{plan.source === "partners" ? tb("viaPartners") : tb("unlimited")}</p>
          ) : plan.free_analyses_limit === null ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{tb("noLimitHere")}</p>
          ) : (
            <>
              <p className="mt-2 font-display text-[22px] font-semibold tabular-nums leading-none tracking-tight">{tb("used", { used: plan.free_analyses_used, limit: plan.free_analyses_limit })}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-line" aria-hidden="true">
                <div
                  className={`h-full transition-[width] duration-700 ${nearLimit ? "bg-pending" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, (plan.free_analyses_used / Math.max(1, plan.free_analyses_limit)) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-muted">{tb("remaining", { remaining: freeLeft ?? 0 })}</p>
              {plan.billing_configured &&
                (nearLimit ? (
                  <Link href="/planos" className={buttonClasses("primary", "sm", "mt-3")}>
                    {tb("cta")}
                  </Link>
                ) : (
                  <Link href="/planos" className="mt-3 inline-block text-[12.5px] font-medium text-accent hover:underline">
                    {tb("activate")} →
                  </Link>
                ))}
            </>
          )}
        </div>
      )}

      {/* previsões: o placar que dá sentido ao produto */}
      <div className="mt-4 rounded-md border border-line bg-paper p-4 fade-in" style={{ animationDelay: "250ms" }}>
        <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">
          <Target size={14} strokeWidth={1.75} className="text-accent" />
          {t("predictions")}
        </p>
        {accuracy && accuracy.total > 0 ? (
          <>
            <p className="mt-2 font-display text-[40px] font-bold leading-none tabular-nums tracking-tight text-accent">{accuracy.rate}%</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">{t("accuracyDetail", { confirmed: accuracy.confirmed, total: accuracy.total })}</p>
          </>
        ) : (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("accuracyNone")}</p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-4 pt-8">
        {/* suporte e documentos ficam sempre à mão, não escondidos numa página só */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-muted">
          <a href={supportMailto("Publishub: preciso de ajuda")} className="hover:text-ink">
            {tCommon("support")}
          </a>
          <Link href="/privacidade" className="hover:text-ink">
            {tCommon("privacy")}
          </Link>
          <Link href="/termos" className="hover:text-ink">
            {tCommon("terms")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-[15px] font-semibold text-accent">{initialOf(name, user.email)}</span>
          <span className="min-w-0 flex-1">
            {name && <span className="block truncate text-[13.5px] font-medium">{name}</span>}
            <span className="block truncate text-[12.5px] text-ink-muted">{user.email}</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            title={t("signOut")}
            aria-label={t("signOut")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A moldura das páginas logadas: painel lateral fixo no desktop, barra com
 * menu-gaveta no celular. As páginas públicas continuam com o SiteHeader.
 */
export function AppShell({ session, children }: AppShellProps) {
  const t = useTranslations("Shell");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false); // a gaveta fecha ao clicar num item (onNavigate)

  // Publishub Partners: quem chegou por /?ref=CODE tem o código no cookie; o backend
  // decide se a indicação vale (conta nova, não é a própria, ainda sem indicação).
  useEffect(() => {
    const code = readReferralCookie();
    if (!code) return;
    apiFetch("/api/referrals/claim", { method: "POST", body: { code } })
      .catch(() => {})
      .finally(clearReferralCookie);
  }, []);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-paper-raised px-4 py-6 lg:flex">
        <Panel session={session} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
          <Link href="/dashboard" className="flex items-center hover:no-underline">
            <Logo size="sm" label={tCommon("brand")} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/nova-analise" className={buttonClasses("primary", "sm")}>
              {tCommon("newAnalysis")}
            </Link>
            <button type="button" onClick={() => setOpen(true)} aria-label={t("menu")} className="grid h-9 w-9 place-items-center rounded-sm border border-line text-ink">
              <Menu size={18} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button type="button" aria-label={t("close")} onClick={() => setOpen(false)} className="fade-in absolute inset-0 bg-[rgba(30,27,22,0.35)]" />
            <div className="drawer-in absolute inset-y-0 left-0 flex w-[288px] max-w-[85vw] flex-col bg-paper-raised px-4 py-6 shadow-float">
              <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-sm text-ink-muted hover:bg-paper hover:text-ink">
                <X size={18} strokeWidth={1.75} />
              </button>
              <Panel session={session} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
