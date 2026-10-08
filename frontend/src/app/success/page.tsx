import { Suspense } from "react";
import { PaymentSuccess } from "@/components/PaymentSuccess";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Para onde os links de pagamento do Stripe mandam depois da compra
 * (getpublishub.com/success?session_id={CHECKOUT_SESSION_ID}).
 */
export default function SuccessPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pb-24 pt-16 lg:pt-24">
        <div className="mx-auto max-w-[560px]">
          <Suspense fallback={null}>
            <PaymentSuccess />
          </Suspense>
        </div>
      </main>
    </>
  );
}
