"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { STILLWORKS_URL } from "@/lib/founding";
import { counterpart, HTML_LANG, localeOf, localePath, type Locale } from "@/lib/i18n";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

/**
 * O cabeçalho e o rodapé do site inteiro, nos dois idiomas: o idioma vem do caminho (/pt é português).
 * Também acerta o lang do <html> nas páginas em português e oferece a versão em português
 * para quem usa o navegador em português e caiu numa página em inglês.
 */

const COPY = {
  en: {
    nav: [
      { href: "/check", label: "Free app check", cta: "nav_check" },
      { href: "/#how-it-works", label: "How it works", cta: "nav_how" },
      { href: "/founding", label: "Founding Customers", cta: "nav_founding" },
      { href: "/#faq", label: "FAQ", cta: "nav_faq" },
    ],
    main: "Main",
    join: "Join the waitlist",
    joinShort: "Join",
    logo: `${SITE_NAME} early access`,
    switchLabel: "Ver em português",
    switchShort: "PT",
    about: "Verification for software built with AI coding agents. In development: features described here are planned and may change.",
    footer: "Footer",
    links: { check: "Free app check", guides: "Guides", open: "Open source", privacy: "Privacy", terms: "Terms", contact: "Contact" },
  },
  pt: {
    nav: [
      { href: "/check", label: "Teste grátis", cta: "nav_check" },
      { href: "/#how-it-works", label: "Como funciona", cta: "nav_how" },
      { href: "/founding", label: "Founding Customers", cta: "nav_founding" },
      { href: "/#faq", label: "Dúvidas", cta: "nav_faq" },
    ],
    main: "Principal",
    join: "Entrar na lista",
    joinShort: "Entrar",
    logo: `${SITE_NAME}, acesso antecipado`,
    switchLabel: "View in English",
    switchShort: "EN",
    about: "Verificação para software feito com agentes de IA. Em desenvolvimento: o que está descrito aqui é planejado e pode mudar.",
    footer: "Rodapé",
    links: { check: "Teste grátis", guides: "Guias (em inglês)", open: "Open source", privacy: "Privacidade", terms: "Termos", contact: "Contato" },
  },
} satisfies Record<Locale, unknown>;

const NAV_LINK = "inline-flex min-h-11 items-center rounded-md px-3 text-[15px] font-medium text-ink no-underline hover:bg-surface hover:text-ink";

function useLocale(): { locale: Locale; pathname: string } {
  const pathname = usePathname() || "/";
  return { locale: localeOf(pathname).locale, pathname };
}

/** Quem usa o navegador em português e está numa página em inglês: um convite discreto para a versão em português. */
function PortugueseSuggestion({ pathname }: { pathname: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      let dismissed = false;
      try {
        dismissed = window.localStorage.getItem("pu-lang-dismissed") === "1";
      } catch {
        // sem armazenamento: só não lembra a escolha
      }
      setShow(!dismissed && (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase().startsWith("pt"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <div lang="pt-BR" className="border-t border-line bg-accent-soft">
      <div className="container-page flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1 text-[15px]">
        <p>Prefere ler em português?</p>
        <div className="flex items-center gap-3">
          <Link href={counterpart(pathname)} data-cta="lang_suggest_pt" className="inline-flex min-h-11 items-center font-semibold">
            Ver em português
          </Link>
          <button
            type="button"
            onClick={() => {
              setShow(false);
              try {
                window.localStorage.setItem("pu-lang-dismissed", "1");
              } catch {
                // nada a lembrar
              }
            }}
            className="inline-flex min-h-11 items-center px-2 text-muted hover:text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export function WaitlistHeader() {
  const { locale, pathname } = useLocale();
  const t = COPY[locale];

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="container-page flex min-h-16 items-center justify-between gap-3">
        <Logo href={localePath(locale, "/")} label={t.logo} />
        <nav aria-label={t.main} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {t.nav.map((item) => (
              <li key={item.href}>
                <Link href={localePath(locale, item.href)} data-cta={item.cta} className={NAV_LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={counterpart(pathname)}
            hrefLang={locale === "en" ? "pt-BR" : "en-US"}
            data-cta={locale === "en" ? "lang_pt" : "lang_en"}
            aria-label={t.switchLabel}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line-strong px-2 text-sm font-semibold tracking-wide text-ink no-underline hover:border-accent hover:text-ink"
          >
            {t.switchShort}
          </Link>
          <ThemeToggle />
          {/* em telas bem estreitas (320 px) o texto longo não cabe ao lado da marca: vira a versão curta, com o mesmo nome acessível */}
          <Link href={localePath(locale, "/#early-access")} data-cta="nav_join" aria-label={t.join} className={buttonClasses("primary", "md")}>
            <span className="min-[420px]:hidden">{t.joinShort}</span>
            <span className="hidden min-[420px]:inline">{t.join}</span>
          </Link>
        </div>
      </div>
      {locale === "en" && <PortugueseSuggestion pathname={pathname} />}
    </header>
  );
}

export function WaitlistFooter() {
  const { locale } = useLocale();
  const t = COPY[locale];
  const link = "inline-flex min-h-11 items-center text-ink";
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">{SITE_NAME}</p>
          <p className="mt-1 max-w-prose text-sm text-muted">{t.about}</p>
        </div>
        <nav aria-label={t.footer}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link href={localePath(locale, "/check")} className={link}>
                {t.links.check}
              </Link>
            </li>
            <li>
              <Link href="/guides" className={link}>
                {t.links.guides}
              </Link>
            </li>
            <li>
              <a href={STILLWORKS_URL} className={link}>
                {t.links.open}
              </a>
            </li>
            <li>
              <Link href="/privacy" className={link}>
                {t.links.privacy}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={link}>
                {t.links.terms}
              </Link>
            </li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={link}>
                {t.links.contact}
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-sm text-muted">
          © {new Date().getFullYear()} {SITE_NAME}.
        </p>
      </div>
    </footer>
  );
}
