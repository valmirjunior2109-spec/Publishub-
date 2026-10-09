"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "next-intl";
import { capture } from "@/lib/analytics";

/**
 * Um <Link> que avisa o PostHog do clique (`cta_clicked`, com `where`).
 *
 * Só o PostHog: quem clica num botão do site público quase sempre ainda não tem
 * conta, e o /api/events recusa quem não tem sessão.
 */
export function TrackedLink({ where, onClick, ...props }: ComponentProps<typeof Link> & { where: string }) {
  const locale = useLocale();
  return (
    <Link
      {...props}
      onClick={(event) => {
        capture("cta_clicked", null, locale, { where, target: typeof props.href === "string" ? props.href : null });
        onClick?.(event);
      }}
    />
  );
}
