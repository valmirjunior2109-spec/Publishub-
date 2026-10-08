import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { analyses } from "@/lib/fixtures";

const sample = analyses[0];

/* Dentro do painel escuro a curva é desenhada em branco, com a queda no rosa claro: os tokens são trocados localmente. */
const onInk = { "--ink": "rgba(255,255,255,0.92)", "--ink-muted": "rgba(255,255,255,0.5)", "--accent": "#f06aa4", "--accent-rgb": "240, 106, 164", "--line": "rgba(255,255,255,0.14)" } as CSSProperties;

/** Entrar / criar conta: o formulário à esquerda, o que a pessoa vai ver depois à direita. */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("Auth.panel");
  return (
    <>
      <SiteHeader />
      <main className="container-page grid items-stretch gap-10 pb-24 pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:pt-14">
        <div className="stagger flex items-start lg:pt-6">{children}</div>

        <Reveal delay={150} as="section" className="hidden lg:block">
          <div className="relative flex h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-3xl border border-line bg-[#0a0a0b] p-10 text-white">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#f06aa4]">{t("eyebrow")}</p>
              <h2 className="mt-4 max-w-[18ch] font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.04em] text-balance">{t("title")}</h2>
            </div>

            <Reveal variant="curve" delay={500} className="my-8 rounded-xl border border-white/10 bg-white/[0.03] p-4" style={onInk}>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} axisSize={18} />
            </Reveal>

            <ol className="stagger grid gap-4 sm:grid-cols-3" style={{ animationDelay: "600ms" }}>
              {(["one", "two", "three"] as const).map((key, index) => (
                <li key={key} className="border-t border-white/15 pt-4">
                  <span className="font-mono text-[12px] text-[#f06aa4]">{String(index + 1).padStart(2, "0")}</span>
                  <p className="mt-2 text-[14px] leading-snug text-white/80">{t(key)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </main>
    </>
  );
}
