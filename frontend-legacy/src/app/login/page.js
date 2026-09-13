import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Entrar — Publishub" };

export default function LoginPage() {
  return (
    <div className="container">
      <AuthForm mode="login" />
    </div>
  );
}
