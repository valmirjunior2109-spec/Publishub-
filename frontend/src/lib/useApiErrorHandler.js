"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "./supabase";

/** Returns a handler that sends the user to /login when the backend says the session is gone. */
export function useApiErrorHandler() {
  const router = useRouter();
  return useCallback(
    async (error) => {
      if (error?.status === 401) {
        await getSupabase()?.auth.signOut();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router]
  );
}
