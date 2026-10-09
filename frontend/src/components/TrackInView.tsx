"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { capture, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Dispara `event` uma vez, quando este ponto da página aparece na tela — o
 * "chegou a ver o preço" que a visita sozinha não diz.
 */
export function TrackInView({ event, where }: { event: AnalyticsEvent; where: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const locale = useLocale();

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      capture(event, null, locale, { where });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [event, where, locale]);

  return <span ref={ref} aria-hidden="true" />;
}
