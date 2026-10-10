"use client";

import { AppShell } from "@/components/AppShell";
import { MemoryPanel } from "@/components/MemoryPanel";
import { RequireAuth } from "@/components/RequireAuth";

/** A memória do criador: o que a Publishub aprendeu com a pessoa (ver MemoryPanel). */
export default function MemoryPage() {
  return (
    <RequireAuth>
      {(session) => (
        <AppShell session={session}>
          <MemoryPanel />
        </AppShell>
      )}
    </RequireAuth>
  );
}
