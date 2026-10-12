import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("terms", "/terms");
}

export default function TermsPage() {
  return <LegalPage namespace="terms" />;
}
