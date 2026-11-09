import Link from "next/link";
import { LogoArt, MARK_RATIO } from "@/components/LogoArt";
import { SITE_NAME } from "@/lib/site";

/** A marca: o caderno com a caneta e o nome. O link leva à home (ou ao início da página de quem chama) e diz isso aos leitores de tela. */
export function Logo({ href = "/", label = `${SITE_NAME} home` }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-ink no-underline hover:text-ink" aria-label={label}>
      <LogoArt width={26 * MARK_RATIO} height={26} halo="var(--bg)" pen="var(--logo-pen)" />
      <span className="text-lg font-bold tracking-[-0.02em]">{SITE_NAME}</span>
    </Link>
  );
}
