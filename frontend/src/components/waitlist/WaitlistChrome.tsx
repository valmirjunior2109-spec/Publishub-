import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";
import { WAITLIST_PATH } from "@/lib/waitlist";

/**
 * O cabeçalho e o rodapé da home (a lista de espera): só o que leva à inscrição. A página é de outro público
 * (desenvolvedores), então não mostra o menu do scanner de lojas.
 */

const NAV = [
  { href: "/#how-it-works", label: "How it works", cta: "nav_how" },
  { href: "/#preview", label: "Preview", cta: "nav_preview" },
  { href: "/#pricing", label: "Pricing", cta: "nav_pricing" },
  { href: "/#faq", label: "FAQ", cta: "nav_faq" },
];

const NAV_LINK = "inline-flex min-h-11 items-center rounded-md px-3 text-[15px] font-medium text-ink no-underline hover:bg-surface hover:text-ink";

export function WaitlistHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="container-page flex min-h-16 items-center justify-between gap-3">
        <Logo href={WAITLIST_PATH} label={`${SITE_NAME} early access`} />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} data-cta={item.cta} className={NAV_LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* em telas bem estreitas (320 px) o texto longo não cabe ao lado da marca: vira "Join", com o mesmo nome acessível */}
          <Link href="/#early-access" data-cta="nav_join" aria-label="Join the waitlist" className={buttonClasses("primary", "md")}>
            <span className="min-[380px]:hidden">Join</span>
            <span className="hidden min-[380px]:inline">Join the waitlist</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function WaitlistFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">{SITE_NAME}</p>
          <p className="mt-1 max-w-prose text-sm text-muted">Verification for software built with AI coding agents. In development: features described here are planned and may change.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link href="/privacy" className="inline-flex min-h-11 items-center text-ink">
                Privacy
              </Link>
            </li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center text-ink">
                Contact
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
