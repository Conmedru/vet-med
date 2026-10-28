import { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";

export const metadata: Metadata = {
  title: "Восстановление пароля",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Восстановление пароля"
      description="Укажите email, указанный при регистрации — мы отправим ссылку для восстановления."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
