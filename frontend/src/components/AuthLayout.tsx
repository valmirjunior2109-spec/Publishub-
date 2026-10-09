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
      <main className="container-page grid items-stretch gap-10 overflow-x-clip pb-24 pt-10 lg:max-w-[1360px] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-14 lg:pt-14">
        <div className="stagger flex items-start">{children}</div>

        <Reveal delay={150} as="section" className="hidden lg:block">
          <div className="relative flex h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-3xl border border-line bg-[#1e1b18] p-10 text-[#f6f0e4]">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#9db5ff]">{t("eyebrow")}</p>
              <h2 className="mt-4 max-w-[18ch] font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.04em] text-balance">{t("title")}</h2>
            </div>

            <Reveal variant="curve" delay={500} className="my-8 rounded-xl border border-[#f6f0e4]/10 bg-[#f6f0e4]/[0.04] p-4" style={onInk}>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} axisSize={18} />
            </Reveal>

            <ol className="stagger grid gap-4 sm:grid-cols-3" style={{ animationDelay: "600ms" }}>
              {(["one", "two", "three"] as const).map((key, index) => (
                <li key={key} className="border-t border-[#f6f0e4]/15 pt-4">
                  <span className="font-mono text-[12px] text-[#9db5ff]">{String(index + 1).padStart(2, "0")}</span>
                  <p className="mt-2 text-[14px] leading-snug text-[#f6f0e4]/80">{t(key)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </main>
    </>
  );
}
