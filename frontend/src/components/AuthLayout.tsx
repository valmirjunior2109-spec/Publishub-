import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { RetentionCurve } from "@/components/RetentionCurve";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { analyses } from "@/lib/fixtures";

const sample = analyses[0];

/* Dentro do painel verde a curva é desenhada em papel: os tokens são trocados localmente. */
const onGreen = { "--ink": "rgba(255,253,248,0.95)", "--accent": "#fffdf8", "--line": "rgba(255,253,248,0.28)" } as CSSProperties;

/** Entrar / criar conta: o formulário à esquerda, o que a pessoa vai ver depois à direita. */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("Auth.panel");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-page items-stretch gap-10 px-5 pb-24 pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:px-16 lg:pt-14">
        <div className="stagger flex items-start lg:pt-6">{children}</div>

        <Reveal delay={150} as="section" className="hidden lg:block">
          <div className="flex h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-md bg-[linear-gradient(160deg,#12b893_0%,#078b72_55%,#06735e_100%)] p-10 text-paper-raised">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] opacity-80">{t("eyebrow")}</p>
              <h2 className="mt-3 max-w-[18ch] font-display text-[34px] font-medium leading-[1.12] tracking-tight text-balance">{t("title")}</h2>
            </div>

            <Reveal variant="curve" delay={500} className="my-8 rounded-md border border-[rgba(255,253,248,0.25)] bg-[rgba(255,253,248,0.08)] p-4" style={onGreen}>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
            </Reveal>

            <ol className="stagger grid gap-4 sm:grid-cols-3" style={{ animationDelay: "600ms" }}>
              {(["one", "two", "three"] as const).map((key, index) => (
                <li key={key} className="border-t border-[rgba(255,253,248,0.35)] pt-3">
                  <span className="font-display text-[13px] opacity-75">0{index + 1}</span>
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
