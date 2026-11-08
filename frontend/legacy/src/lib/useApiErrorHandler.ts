"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ApiError } from "./api";
import { signOut } from "./supabase";

/** Manda para /login quando o backend diz que a sessão acabou. Devolve true se tratou. */
export function useApiErrorHandler() {
  const router = useRouter();
  return useCallback(
    async (error: ApiError | null | undefined) => {
      if (error?.status === 401) {
        await signOut();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );
}
