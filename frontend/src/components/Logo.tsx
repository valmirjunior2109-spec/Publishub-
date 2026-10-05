import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg";

/* ---------- o símbolo: o caderno do editor (viewBox 104×120) ----------
   O caderno (caramelo), o elástico (tinta, a agulha da linha do tempo), a borda
   das páginas (papel, a timeline do vídeo) e a caneta (azul, a decisão do
   editor) a 20°. A caneta usa --logo-pen (globals.css): no tema escuro ela
   clareia para não sumir no fundo. Quem muda o desenho muda também icon.svg e a
   rota /og, que repetem estes números. */
function Mark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 104 120" className={className} style={style} aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="66" height="104" rx="11" fill="#C9824A" />
      <rect x="14" y="93" width="54" height="9" rx="4.5" fill="#FBF3E6" />
      <rect x="54" y="8" width="8" height="104" fill="#1E1B18" />
      <g transform="rotate(20 75 58)" style={{ fill: "var(--logo-pen)" }}>
        <rect x="70" y="8" width="10" height="80" rx="5" />
        <rect x="78" y="12" width="5" height="4" rx="1" />
        <rect x="81" y="12" width="3.4" height="26" rx="1.7" />
        <path d="M70.5 86 L79.5 86 L75 99 Z" />
        <rect x="74.2" y="40" width="1.6" height="40" rx="0.8" fill="#FBF3E6" />
        <circle cx="75" cy="99.5" r="1.3" fill="#1E1B18" />
      </g>
    </svg>
  );
}

interface LogoMarkProps {
  /** Altura em px; a largura segue a proporção do caderno. */
  size?: number;
  className?: string;
}

/** O ícone: o caderno sozinho, com `size` px de altura. */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return <Mark className={cn("block shrink-0", className)} style={{ height: size, width: (size * 104) / 120 }} />;
}

interface LogoProps {
  variant?: "horizontal" | "icon";
  size?: LogoSize;
  /** Texto acessível ("Publishub"), vindo das mensagens. */
  label: string;
  className?: string;
}

const ICON: Record<LogoSize, number> = { sm: 26, md: 34, lg: 44 };
const TEXT: Record<LogoSize, string> = { sm: "text-[19px]", md: "text-[23px]", lg: "text-[30px]" };

/**
 * Marca da Publishub: o caderno e o wordmark "publishub" em caixa baixa, lado a lado.
 * O nome é escrito à mão, na mesma letra das anotações da caneta (Caveat), reto.
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
    <span role="img" aria-label={label} className={cn("inline-flex select-none items-center gap-[0.28em] whitespace-nowrap leading-none text-ink", TEXT[size], className)}>
      {/* largura explícita: sem ela o Firefox não deduz a proporção do viewBox */}
      <Mark className="block shrink-0" style={{ height: "1.3em", width: "1.127em" }} />
      <span aria-hidden="true" className="font-hand text-[1.5em] font-bold leading-none">
        publishub
      </span>
    </span>
  );
}
