"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { captureReferralFromUrl } from "@/lib/referral";

/**
 * Em qualquer página: se a URL tem ?ref=CODE, guarda o código para a indicação valer depois
 * e avisa o backend, uma vez por navegador, para contar o clique no link do Partner.
 */
export function ReferralCapture() {
  useEffect(() => {
    const code = captureReferralFromUrl();
    if (code) apiFetch("/api/referrals/click", { method: "POST", body: { code } }).catch(() => {}); // contar o clique nunca atrapalha a visita
  }, []);
  return null;
}
