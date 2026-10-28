import { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/login-form";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в личный кабинет специалиста на портале CON-VET.RU.",
};

export default function LoginPage() {
  return (
    <AuthShell title="Вход в личный кабинет">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
