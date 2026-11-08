import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-20">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-lg">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className={buttonClasses("primary", "md", "mt-6")}>
        Go to the home page
      </Link>
    </div>
  );
}
