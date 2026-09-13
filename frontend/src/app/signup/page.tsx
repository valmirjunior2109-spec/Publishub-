import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-5 pb-24">
        <AuthForm mode="signup" />
      </main>
    </>
  );
}
