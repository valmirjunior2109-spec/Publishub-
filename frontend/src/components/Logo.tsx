import { useId } from "react";
import { LogoArt, MARK_RATIO } from "@/components/LogoArt";
import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg";

/* ---------- o símbolo: o caderno do editor com a caneta ----------
   O desenho mora em LogoArt.tsx (a única fonte dos números). Aqui o respiro da
   caneta é um recorte transparente, porque o logo aparece sobre fundos
   diferentes; a caneta usa --logo-pen (globals.css), que clareia no tema escuro. */
function Mark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  // um id por logo na página: a máscara de um não pode recortar o outro
  const maskId = `logo-cut-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return <LogoArt width="100%" height="100%" maskId={maskId} pen="var(--logo-pen)" className={className} style={style} />;
}

interface LogoMarkProps {
  /** Altura em px; a largura segue a proporção do caderno. */
  size?: number;
  className?: string;
}

/** O ícone: o caderno sozinho, com `size` px de altura. */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return <Mark className={cn("block shrink-0", className)} style={{ height: size, width: size * MARK_RATIO }} />;
}

interface LogoProps {
  variant?: "horizontal" | "icon";
  size?: LogoSize;
  /** Texto acessível ("Publishub"), vindo das mensagens. */
  label: string;
  className?: string;
}

const ICON: Record<LogoSize, number> = { sm: 26, md: 34, lg: 44 };
const TEXT: Record<LogoSize, string> = { sm: "text-[16px]", md: "text-[18px]", lg: "text-[24px]" };

/**
 * Marca da Publishub: o caderno e o wordmark "Publishub", com o P maiúsculo, lado a lado.
 * O nome vem na Geist semibold, com o espaçamento fechado dos títulos.
 * O símbolo tem 1,3 vez a altura do texto e fica centrado nele.
 */
export function Logo({ variant = "horizontal", size = "md", label, className }: LogoProps) {
  if (variant === "icon") {
    return (
      <span role="img" aria-label={label} className={cn("inline-flex", className)}>
        <LogoMark size={ICON[size]} />
      </span>
    );
  }
  return (
    <span role="img" aria-label={label} className={cn("inline-flex select-none items-center gap-[0.4em] whitespace-nowrap leading-none text-ink", TEXT[size], className)}>
      {/* largura explícita: sem ela o Firefox não deduz a proporção do viewBox */}
      <Mark className="block shrink-0" style={{ height: "1.3em", width: `${(1.3 * MARK_RATIO).toFixed(3)}em` }} />
      <span aria-hidden="true" className="font-display font-semibold leading-none tracking-[-0.035em]">
        Publishub
      </span>
    </span>
  );
}
