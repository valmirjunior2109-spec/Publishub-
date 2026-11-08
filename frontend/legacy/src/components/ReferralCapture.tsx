"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { captureReferralFromUrl, markVisited } from "@/lib/referral";

/** Em qualquer página: se a URL tem ?ref=CODE, guarda o código (a indicação vale depois) e conta o clique. */
export function ReferralCapture() {
  useEffect(() => {
    const code = captureReferralFromUrl();
    if (code && markVisited(code)) {
      apiFetch("/api/referrals/visit", { method: "POST", body: { code } }).catch(() => {});
    }
  }, []);
  return null;
}
