"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";

/**
 * O único passo de onboarding: o que o Publishub faz, em três linhas, e um
 * botão que leva ao primeiro vídeo. Marcar como visto acontece aqui, não no
 * upload: quem leu e saiu não precisa ler de novo.
 */
function Welcome({ session }: { session: Session }) {
  const t = useTranslations("Welcome");
  const router = useRouter();
  const [going, setGoing] = useState(false);
  const firstName = ((session.user.user_metadata?.full_name as string | undefined) || session.user.email?.split("@")[0] || "").trim().split(/\s+/)[0];

  async function start() {
    setGoing(true);
    // o registro é do servidor (ele grava onboarded_at e o evento); se falhar,
    // seguir em frente é melhor do que prender a pessoa numa tela de boas-vindas
    await apiFetch("/api/me/onboarded", { method: "POST" }).catch(() => {});
    router.push("/nova-analise");
  }

  return (
    <main className="mx-auto max-w-[680px] px-5 pb-24 pt-10 lg:pt-16">
      <Reveal>
        <p className="eyebrow">{firstName ? t("eyebrow", { name: firstName }) : t("eyebrowAnon")}</p>
        <h1 className="mt-3 font-display text-[32px] font-medium leading-tight tracking-tight sm:text-[40px]">{t("title")}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">{t("lead")}</p>
      </Reveal>

      <Reveal delay={120}>
        <ol className="mt-9 flex flex-col">
          {(["1", "2", "3"] as const).map((n, index) => (
            <li key={n} className="grid gap-3 border-t border-line py-5 last:border-b sm:grid-cols-[auto_1fr] sm:gap-6">
              <span className="font-display text-[13px] tabular-nums text-ink-muted">0{index + 1}</span>
              <div>
                <p className="font-display text-[18px] font-medium leading-snug tracking-tight">{t(`steps.${n}.title`)}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{t(`steps.${n}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal delay={240} className="mt-9">
        {/* mobile primeiro: botão de largura cheia e alvo de toque grande */}
        <Button className="min-h-12 w-full sm:w-auto sm:px-8" disabled={going} onClick={start}>
          {t("cta")}
        </Button>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t("note")}</p>
      </Reveal>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <RequireAuth>
      {(session) => (
        <AppShell session={session}>
          <Welcome session={session} />
        </AppShell>
      )}
    </RequireAuth>
  );
}
