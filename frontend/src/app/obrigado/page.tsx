import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ThankYou } from "@/components/ThankYou";

/**
 * Destino do redirecionamento do Stripe depois do pagamento
 * (?session_id={CHECKOUT_SESSION_ID}). O que acontece com a sessão está em ThankYou.
 */
export default function ThankYouPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pb-24 pt-16 lg:pt-24">
        <div className="mx-auto max-w-[560px]">
          <Suspense fallback={null}>
            <ThankYou />
          </Suspense>
        </div>
      </main>
    </>
  );
}
