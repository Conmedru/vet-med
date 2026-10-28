import { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { ResetPasswordForm } from "@/components/account/reset-password-form";

export const metadata: Metadata = {
  title: "Новый пароль",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Новый пароль">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
