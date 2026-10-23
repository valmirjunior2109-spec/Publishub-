import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { analyses } from "@/lib/fixtures";

const sample = analyses[0];

/* Dentro do painel de tinta a curva é desenhada em papel, com a queda na tinta azul clara: os tokens são trocados localmente. */
const onInk = { "--ink": "rgba(246,240,228,0.95)", "--ink-muted": "rgba(246,240,228,0.55)", "--accent": "#9db5ff", "--accent-rgb": "157, 181, 255", "--line": "rgba(246,240,228,0.16)" } as CSSProperties;

/** Entrar / criar conta: o formulário à esquerda, o que a pessoa vai ver depois à direita. */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("Auth.panel");
  return (
    <>
      <SiteHeader />
      <main className="container-page grid items-stretch gap-6 overflow-x-clip pb-12 pt-6 lg:max-w-[1240px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:pt-8">
        <div className="stagger flex items-start">{children}</div>

        <Reveal delay={150} as="section" className="hidden lg:block">
          <div className="relative flex h-full min-h-[480px] flex-col justify-between overflow-hidden rounded-3xl border border-line bg-[#1e1b18] p-7 text-[#f6f0e4]">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#9db5ff]">{t("eyebrow")}</p>
              <h2 className="mt-3 max-w-[20ch] font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.035em] text-balance">{t("title")}</h2>
            </div>

            <Reveal variant="curve" delay={500} className="my-6 rounded-xl border border-[#f6f0e4]/10 bg-[#f6f0e4]/[0.04] p-4" style={onInk}>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} axisSize={22} />
            </Reveal>

            <ol className="stagger grid gap-3 sm:grid-cols-3" style={{ animationDelay: "600ms" }}>
              {(["one", "two", "three"] as const).map((key, index) => (
                <li key={key} className="border-t border-[#f6f0e4]/15 pt-3">
                  <span className="font-mono text-[12px] text-[#9db5ff]">{String(index + 1).padStart(2, "0")}</span>
                  <p className="mt-1.5 text-[13.5px] leading-snug text-[#f6f0e4]/80">{t(key)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </main>
    </>
  );
}
