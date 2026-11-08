"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** Liga o PostHog depois que a página carrega (as visitas de página vêm dele). */
export function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
