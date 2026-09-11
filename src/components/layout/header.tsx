import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard size={16} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Publishub</span>
        </Link>
        <ButtonLink href="/new" size="md">
          Nova análise
        </ButtonLink>
      </div>
    </header>
  );
}
