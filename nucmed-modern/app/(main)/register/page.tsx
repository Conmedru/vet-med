import { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/register-form";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Регистрация на портале CON-VET.RU откроет вам неограниченный доступ ко всем материалам для ветеринарных специалистов.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Регистрация специалиста"
      description="Присоединяйтесь уже сегодня — неограниченный доступ ко всем материалам и персональная подборка публикаций."
      wide
    >
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
