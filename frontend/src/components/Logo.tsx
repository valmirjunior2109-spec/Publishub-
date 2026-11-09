import type { CSSProperties } from "react";
import Link from "next/link";
import { LOGO_RECTS, LOGO_VIEWBOX } from "@/lib/brand/logo-art";
import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/lib/site";

/**
 * A marca: o "P" pixel-art (creme, com a tela </>, a sombra roxa, a estrela e o cursor),
 * fundo transparente. Decorativa: quem dá o nome é o texto ou o aria-label de quem usa.
 */
export function LogoMark({ size = 32, className, style }: { size?: number | string; className?: string; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      style={style}
    >
      {LOGO_RECTS.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  );
}

/*
 * O nome com a logo no lugar do "P": [P]ublishub. Medidas da arte (LOGO_VIEWBOX, 20.5 unidades):
 * o P vai da linha 0 à 16 e o quadro termina na 17 (a sombra fica abaixo, como uma descendente).
 * A base do P assenta na linha de base do texto. O P é uma inicial um pouco maior que as letras
 * (0.9 em; as maiúsculas da Pixelify Sans têm 0.64 em): menor que isso, a tela </> some.
 */
const VIEW = 20.5;
const P_HEIGHT = 16;
const BELOW_P = 1;
const P_EM = 0.9;
const MARK_EM = (P_EM * VIEW) / P_HEIGHT;

/** A logo como o "P" do nome. O link leva à home (ou ao início da página de quem chama) e se chama "Publishub" para os leitores de tela. */
export function Logo({ href = "/", label = `${SITE_NAME} home` }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center text-ink no-underline hover:text-ink" aria-label={label}>
      <span aria-hidden="true" className="whitespace-nowrap font-pixel text-[1.4rem] font-semibold leading-none tracking-[0.01em] sm:text-[1.75rem]">
        <LogoMark size={`${MARK_EM}em`} className="inline-block" style={{ verticalAlign: `-${(P_EM * BELOW_P) / P_HEIGHT}em` }} />
        ublishub
      </span>
    </Link>
  );
}
