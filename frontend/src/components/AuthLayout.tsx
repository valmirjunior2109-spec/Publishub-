import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { analyses } from "@/lib/fixtures";

const sample = analyses[0];

/* Dentro do painel preto a curva é desenhada em branco, com a queda em azul: os tokens são trocados localmente. */
const onInk = { "--ink": "rgba(245,245,247,0.95)", "--accent": "#8fb0ff", "--line": "rgba(245,245,247,0.2)" } as CSSProperties;

/** Entrar / criar conta: o formulário à esquerda, o que a pessoa vai ver depois à direita. */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("Auth.panel");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-page items-stretch gap-10 px-5 pb-24 pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:px-16 lg:pt-14">
        <div className="stagger flex items-start lg:pt-6">{children}</div>

        <Reveal delay={150} as="section" className="hidden lg:block">
          <div className="flex h-full min-h-[560px] flex-col justify-between overflow-hidden relative rounded-[28px] bg-black p-10 text-[#f5f5f7]">
            <div>
              <p className="text-[14px] font-semibold text-[#8fb0ff]">{t("eyebrow")}</p>
              <h2 className="mt-3 max-w-[18ch] font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.045em] text-balance">{t("title")}</h2>
            </div>

            <Reveal variant="curve" delay={500} className="my-8 rounded-md border border-white/10 bg-white/[0.04] p-4" style={onInk}>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
            </Reveal>

            <ol className="stagger grid gap-4 sm:grid-cols-3" style={{ animationDelay: "600ms" }}>
              {(["one", "two", "three"] as const).map((key, index) => (
                <li key={key} className="border-t border-white/15 pt-3">
                  <span className="text-[13px] font-semibold text-[#8fb0ff]">0{index + 1}</span>
                  <p className="mt-1 text-[14px] leading-snug">{t(key)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </main>
    </>
  );
}
