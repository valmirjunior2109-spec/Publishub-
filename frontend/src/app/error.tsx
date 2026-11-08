"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-2xl py-20">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-lg">Please try again. If it keeps happening, email us and we&apos;ll look into it.</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
