import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Criar conta — Publishub" };

export default function SignupPage() {
  return (
    <div className="container">
      <AuthForm mode="signup" />
    </div>
  );
}
