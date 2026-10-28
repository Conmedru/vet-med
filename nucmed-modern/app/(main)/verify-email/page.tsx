import { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { VerifyEmailStatus } from "@/components/account/verify-email-status";

export const metadata: Metadata = {
  title: "Подтверждение email",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Подтверждение email">
      <Suspense fallback={null}>
        <VerifyEmailStatus />
      </Suspense>
    </AuthShell>
  );
}
