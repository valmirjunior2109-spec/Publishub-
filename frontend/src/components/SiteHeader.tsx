import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#what-we-check", label: "What we check" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

const NAV_LINK = "inline-flex min-h-11 items-center rounded-md px-3 text-[15px] font-medium text-ink no-underline hover:bg-surface hover:text-ink";

/**
 * Cabeçalho sem JavaScript: no celular, o menu é um <details> nativo, que já funciona
 * no teclado e nos leitores de tela.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="container-page flex min-h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={NAV_LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/#scan" className={buttonClasses("primary", "md", "hidden sm:inline-flex")}>
            Scan your store
          </Link>
          <details className="relative md:hidden">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-md border border-line-strong bg-card px-3 font-medium [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <nav aria-label="Main" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-line bg-card p-2 shadow-raised">
              <ul className="flex flex-col">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={`${NAV_LINK} w-full`}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/#scan" className={`${NAV_LINK} w-full font-semibold text-accent`}>
                    Scan your store
                  </Link>
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
