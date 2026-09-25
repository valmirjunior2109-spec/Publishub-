import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("privacy", "/privacidade");
}

export default function PrivacyPage() {
  return <LegalPage namespace="privacy" />;
}
