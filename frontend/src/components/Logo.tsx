import Link from "next/link";
import { LOGO_RECTS, LOGO_VIEWBOX } from "@/lib/brand/logo-art";
import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/lib/site";

/**
 * A marca: o "P" pixel-art (creme, com a tela </>, a sombra roxa, a estrela e o cursor),
 * fundo transparente. Decorativa: quem dá o nome é o texto ou o aria-label de quem usa.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={LOGO_VIEWBOX} shapeRendering="crispEdges" aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      {LOGO_RECTS.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  );
}

/** A marca com o nome, em pixel. O link leva à home (ou ao início da página de quem chama) e diz isso aos leitores de tela. */
export function Logo({ href = "/", label = `${SITE_NAME} home` }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-ink no-underline hover:text-ink" aria-label={label}>
      <LogoMark size={34} />
      <span className="font-pixel text-[1.35rem] font-semibold leading-none tracking-[0.01em]">{SITE_NAME}</span>
    </Link>
  );
}
