"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useTypewriter } from "@/lib/useTypewriter";

/**
 * O campo da hero: a caixa onde o criador escreveria para o Publishub. O texto que
 * aparece sendo digitado é só a sugestão e some assim que a pessoa digita; enviar
 * leva para o cadastro, que é onde a análise começa de verdade.
 */
export function HeroPrompt() {
  const t = useTranslations("Landing.hero.prompt");
  const router = useRouter();
  const [value, setValue] = useState("");
  const phrases = useMemo(() => t.raw("phrases") as string[], [t]);
  const text = useTypewriter(phrases);

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push("/signup");
  }

  return (
    <form
      onSubmit={submit}
      className="flex max-w-[54ch] items-center gap-2 rounded-md border border-line bg-paper-raised py-2.5 pl-4 pr-2.5 transition-colors focus-within:border-ink-muted"
    >
      <div className="relative min-w-0 flex-1">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={t("label")}
          maxLength={200}
          // o halo de foco global vale para os formulários; aqui quem reage ao foco é a caixa inteira
          className="w-full bg-transparent text-[15px] leading-6 text-ink outline-none focus:!shadow-none"
        />
        {value === "" && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center text-[15px] leading-6 text-ink-muted">
            <span className="truncate">{text}</span>
            {/* o piscar para sozinho quando o sistema pede menos movimento (globals.css) */}
            <span className="caret-blink ml-px inline-block h-[1.05em] w-px shrink-0 bg-ink-muted" />
          </span>
        )}
      </div>
      <button type="submit" aria-label={t("send")} className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-accent text-paper-raised transition-colors hover:bg-accent-strong">
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {/* as sugestões ficam legíveis para leitor de tela sem serem lidas letra a letra */}
      <span className="sr-only">{t("examples", { list: phrases.join(", ") })}</span>
    </form>
  );
}
