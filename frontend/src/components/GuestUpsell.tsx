"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";

/**
 * O único pedido de cadastro do fluxo: depois de ver a aposta, para abrir a
 * análise completa. O que o convidado já fez fica guardado — quem se cadastra
 * leva a previsão consigo (o claim acontece no AuthForm).
 */
export function GuestUpsell() {
  const t = useTranslations("Analysis.guest");

  return (
    <section className="rounded-md border border-line bg-paper-raised p-6 sm:p-8">
      <p className="t-label">{t("eyebrow")}</p>
      <h2 className="mt-2.5 font-display text-[24px] font-medium leading-tight tracking-tight sm:text-[27px]">{t("title")}</h2>
      <ul className="mt-5 flex flex-col gap-2.5 text-[14.5px] leading-relaxed">
        {(["1", "2", "3"] as const).map((n) => (
          <li key={n} className="flex gap-3">
            <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {t(`items.${n}`)}
          </li>
        ))}
      </ul>
      <Link href="/signup" className={buttonClasses("primary", "md", "mt-6 min-h-12 w-full px-7 sm:w-auto")}>
        {t("cta")}
      </Link>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">{t("note")}</p>
    </section>
  );
}
