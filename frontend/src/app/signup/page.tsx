import { AuthForm } from "@/components/AuthForm";
import { AuthLayout } from "@/components/AuthLayout";

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
