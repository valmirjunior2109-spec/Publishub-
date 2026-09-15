"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "./api";
import { FREE_UPLOADS } from "./pricing";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "./upload";

/**
 * Mensagem de erro no idioma do site. O backend manda um código junto com um texto em pt-BR:
 * código conhecido vira tradução; sem tradução, o texto do backend só aparece no site em português.
 */
export function useErrorText() {
  const t = useTranslations("Errors");
  const locale = useLocale();
  return useCallback(
    (err: unknown): string => {
      if (!(err instanceof ApiError)) return t("generic");
      if (err.code === "NETWORK_ERROR") return t("network");
      const key = `api.${err.code}` as "api.NOT_FOUND";
      if (t.has(key)) return t(key, { limit: FREE_UPLOADS, videoMb: MAX_VIDEO_BYTES / 1024 / 1024, imageMb: MAX_IMAGE_BYTES / 1024 / 1024 });
      return locale === "pt-BR" && err.message ? err.message : t("generic");
    },
    [t, locale],
  );
}
