import Link from "next/link";
import { LogoArt, MARK_RATIO } from "@/components/LogoArt";
import { SITE_NAME } from "@/lib/site";

/** A marca: o caderno com a caneta e o nome. O link leva à home e diz isso aos leitores de tela. */
export function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-ink no-underline hover:text-ink" aria-label={`${SITE_NAME} home`}>
      <LogoArt width={26 * MARK_RATIO} height={26} halo="#ffffff" />
      <span className="text-lg font-bold tracking-[-0.02em]">{SITE_NAME}</span>
    </Link>
  );
}
