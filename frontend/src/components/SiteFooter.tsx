import Link from "next/link";
import { DISCLAIMER, SITE_NAME, SUPPORT_EMAIL, TAGLINE } from "@/lib/site";

const LINKS = [
  { href: "/shopify-ada-compliance-checker", label: "Shopify accessibility checker" },
  { href: "/scan/sample", label: "Sample report" },
  { href: "/accessibility-statement", label: "Accessibility statement" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg font-bold">{SITE_NAME}</p>
          <p className="mt-1 text-muted">{TAGLINE}</p>
          <p className="mt-4 max-w-prose text-sm text-muted">
            {DISCLAIMER} Publishub helps you find and fix accessibility issues. Automated checks catch a portion of WCAG issues; manual review is still recommended.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-8 items-center text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-8 items-center text-ink">
                Contact: {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-sm text-muted">
          © {new Date().getFullYear()} {SITE_NAME}. Shopify is a trademark of Shopify Inc. {SITE_NAME} is not affiliated with or endorsed by Shopify.
        </p>
      </div>
    </footer>
  );
}
