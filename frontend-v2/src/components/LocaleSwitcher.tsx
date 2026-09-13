"use client";

import { useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { localeNames, locales } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <label
      className={
        "relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-line bg-paper-raised pl-3 pr-8 text-sm text-ink transition-colors hover:border-ink-muted " +
        (pending ? "opacity-60" : "")
      }
    >
      <Globe size={15} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={onChange}
        disabled={pending}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-sm text-ink focus:outline-none"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={1.5} className="pointer-events-none absolute right-2.5 text-ink-muted" aria-hidden="true" />
    </label>
  );
}
