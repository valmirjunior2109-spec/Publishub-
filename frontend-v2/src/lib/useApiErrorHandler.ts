"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ApiError } from "./api";
import { getSupabase } from "./supabase";

/** Manda para /login quando o backend diz que a sessão acabou. Devolve true se tratou. */
export function useApiErrorHandler() {
  const router = useRouter();
  return useCallback(
    async (error: ApiError | null | undefined) => {
      if (error?.status === 401) {
        await getSupabase()?.auth.signOut();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );
}
