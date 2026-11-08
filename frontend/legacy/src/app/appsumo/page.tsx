import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppSumoRedeem } from "@/components/AppSumoRedeem";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/** O resgate do código do AppSumo. Fora do Google: é a porta de quem já comprou. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AppSumo");
  return { title: { absolute: t("metaTitle") }, robots: { index: false, follow: false } };
}

export default function AppSumoPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pb-12 pt-6 lg:pt-8">
        <div className="mx-auto max-w-[640px]">
          <AppSumoRedeem />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
