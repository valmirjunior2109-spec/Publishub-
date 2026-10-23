"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { Brain, Clapperboard, Gem, Handshake, LogOut, Menu, Plus, Settings, Target, X } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { APPSUMO_PATH, readPendingCode } from "@/lib/appsumo";
import { cn } from "@/lib/cn";
import { track } from "@/lib/events";
import { clearReferralCookie, readReferralCookie } from "@/lib/referral";
import { supportMailto } from "@/lib/support";
import { signOut as encerrarSessao } from "@/lib/supabase";
import { useAccount } from "@/lib/account";

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
        "relative flex items-center gap-3 rounded-md px-3 py-[7px] text-[14px] transition-colors duration-150 hover:no-underline",
        active ? "nav-active bg-surface font-medium text-ink" : "text-ink-muted hover:bg-surface hover:text-ink",
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
  // o plano e o placar vêm da conta, buscados uma vez por navegação para o painel e a página juntos (lib/account.tsx)
  const account = useAccount();
  const accuracy = account.accuracy.data;
  const me = account.me.data;
  const tb = useTranslations("Billing");
  const user = session.user;
  const plan = me?.entitlement;
  const paid = Boolean(plan) && plan?.plan !== "free";
  // o que acaba primeiro é a análise completa, não o upload: é isso que a barra mostra
  const freeLeft = plan && !paid ? plan.free_analyses_remaining : null;
  const nearLimit = freeLeft !== null && freeLeft !== undefined && freeLeft <= 1;
  const name: string | undefined = user.user_metadata?.full_name || undefined;

  async function signOut() {
    await encerrarSessao();
    // A área logada já manda para o login quando a sessão acaba (RequireAuth), e era lá que a saída
    // terminava de fato: o push("/") daqui perdia a corrida. O destino fica dito aqui, sem depender dela.
    router.replace("/login");
  }

  const items = [
    { href: "/dashboard", icon: <Clapperboard size={18} strokeWidth={1.75} />, label: t("analyses"), active: pathname === "/dashboard" || pathname.startsWith("/results/") },
    { href: "/new-analysis", icon: <Plus size={18} strokeWidth={1.75} />, label: t("newAnalysis"), active: pathname === "/new-analysis" },
    // o que a Publishub aprendeu com a pessoa
    { href: "/memory", icon: <Brain size={18} strokeWidth={1.75} />, label: t("memory"), active: pathname === "/memory" },
    { href: "/pricing", icon: <Gem size={18} strokeWidth={1.75} />, label: t("plan"), active: pathname === "/pricing" },
    { href: "/partners", icon: <Handshake size={18} strokeWidth={1.75} />, label: t("partners"), active: pathname === "/partners" },
    { href: "/account", icon: <Settings size={18} strokeWidth={1.75} />, label: tCommon("account"), active: pathname === "/account" },
  ];

  // a gaveta fecha quando a pessoa segue um link; o idioma e o tema abrem e mudam sem fechar a gaveta
  function closeOnLink(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a[href]")) onNavigate?.();
  }

  return (
    <div className="flex min-h-full flex-col" onClick={onNavigate ? closeOnLink : undefined}>
      <Link href="/dashboard" className="flex items-center px-3 hover:no-underline">
        <Logo size="md" label={tCommon("brand")} />
      </Link>

      <nav className="mt-6 flex flex-col gap-0.5" aria-label={t("menu")}>
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* plano: o contador de uploads grátis vem do backend; aqui só se mostra */}
      {plan && (
        <div className="mt-6 rounded-xl border border-line bg-paper p-4 fade-in" style={{ animationDelay: "200ms" }}>
          <p className="t-label flex items-center gap-2">
            <Gem size={14} strokeWidth={1.75} className={paid ? "text-accent" : "text-ink-muted"} />
            {tb(plan.plan)}
          </p>
          {plan.plan === "lifetime" ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{plan.source === "partners" ? tb("viaPartners") : tb("unlimited")}</p>
          ) : plan.plan === "appsumo" && plan.appsumo ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{tb("appsumoNote", { used: plan.appsumo.used_this_month, limit: plan.appsumo.monthly_limit })}</p>
          ) : paid ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{tb("subscriptionNote")}</p>
          ) : plan.free_analyses_limit === null ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{tb("noLimitHere")}</p>
          ) : (
            <>
              <p className="mt-2 font-display text-[22px] font-semibold tabular-nums leading-none tracking-tight">{tb("used", { used: plan.free_analyses_used, limit: plan.free_analyses_limit })}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div
                  className={`h-full transition-[width] duration-700 ${nearLimit ? "bg-pending" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, (plan.free_analyses_used / Math.max(1, plan.free_analyses_limit)) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-muted">{tb("remaining", { remaining: freeLeft ?? 0 })}</p>
              {plan.billing_configured &&
                (nearLimit ? (
                  <Link href="/pricing" onClick={() => track("upgrade_clicked", null, { where: "sidebar", near_limit: true })} className={buttonClasses("primary", "sm", "mt-3")}>
                    {tb("cta")}
                  </Link>
                ) : (
                  <Link href="/pricing" onClick={() => track("upgrade_clicked", null, { where: "sidebar", near_limit: false })} className="mt-3 inline-block text-[12.5px] font-medium text-accent hover:underline">
                    {tb("activate")} →
                  </Link>
                ))}
            </>
          )}
        </div>
      )}

      {/* previsões: o placar só aparece quando existe — para quem começa, era um aviso a mais sem nada a mostrar */}
      {accuracy && accuracy.total > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-paper p-4 fade-in" style={{ animationDelay: "250ms" }}>
          <p className="t-label flex items-center gap-2">
            <Target size={14} strokeWidth={1.75} className="text-accent" />
            {t("predictions")}
          </p>
          <p className="mt-2 font-display text-[32px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-accent">{accuracy.rate}%</p>
          <p className="mt-1 text-[12.5px] text-ink-muted">{t("accuracyDetail", { confirmed: accuracy.confirmed, total: accuracy.total })}</p>
        </div>
      )}

      {/* o pé fica preso embaixo: numa tela baixa os cartões rolam por trás e a conta (e o sair) continua à vista */}
      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-paper-raised pb-6 pt-6 before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-paper-raised before:to-transparent before:content-['']">
        {/* suporte e documentos ficam sempre à mão, não escondidos numa página só */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-muted">
          <a href={supportMailto("publishub: preciso de ajuda")} className="hover:text-ink">
            {tCommon("support")}
          </a>
          <Link href="/privacy" className="hover:text-ink">
            {tCommon("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {tCommon("terms")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* no pé da barra lateral: o menu de idiomas abre para cima */}
          <LocaleSwitcher placement="up" />
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
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
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
  const [open, setOpen] = useState(false); // a gaveta fecha ao clicar num link (onNavigate)
  const router = useRouter();
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // voltar pelo navegador com a gaveta aberta: a página nova chega com ela fechada
  const [openedAt, setOpenedAt] = useState(pathname);
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setOpen(false);
  }

  // gaveta aberta: a página atrás não rola, o foco entra nela e Esc fecha (devolvendo o foco ao botão)
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      // com o menu de idiomas aberto, o Esc é dele
      if (event.key !== "Escape" || document.querySelector('[role="dialog"] [role="menu"]')) return;
      setOpen(false);
      menuButton.current?.focus();
    }
    // a tela cresceu até o painel fixo aparecer: a gaveta some, e a trava de rolagem não pode ficar
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  // AppSumo: o código colado antes de ter conta ficou no navegador. A confirmação do
  // e-mail (ou o Google) pode trazer a pessoa para o painel: ela volta para o resgate.
  useEffect(() => {
    if (readPendingCode()) router.replace(APPSUMO_PATH);
  }, [router]);

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
      <aside className="scroll-slim sticky top-0 hidden h-dvh flex-col overflow-y-auto overscroll-contain border-r border-line bg-paper-raised px-4 pt-6 lg:flex">
        <Panel session={session} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
          <Link href="/dashboard" className="flex items-center hover:no-underline">
            <Logo size="sm" label={tCommon("brand")} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/new-analysis" className={buttonClasses("primary", "sm")}>
              {tCommon("newAnalysis")}
            </Link>
            <button ref={menuButton} type="button" onClick={() => setOpen(true)} aria-label={t("menu")} aria-expanded={open} className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink">
              <Menu size={18} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu")}>
            <button type="button" aria-label={t("close")} onClick={() => setOpen(false)} className="fade-in absolute inset-0 bg-[rgba(30,27,22,0.35)]" />
            <div className="drawer-in scroll-slim absolute inset-y-0 left-0 flex w-[288px] max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-paper-raised px-4 pt-6 shadow-float">
              <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-surface hover:text-ink">
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
