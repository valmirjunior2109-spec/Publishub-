"use client";

import { useEffect } from "react";
import { captureReferralFromUrl } from "@/lib/referral";

/** Em qualquer página: se a URL tem ?ref=CODE, guarda o código para a indicação valer depois. */
export function ReferralCapture() {
  useEffect(() => captureReferralFromUrl(), []);
  return null;
}
