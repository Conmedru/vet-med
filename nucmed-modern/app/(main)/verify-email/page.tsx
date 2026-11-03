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
      <div className="ym-hide-content">
        <Suspense fallback={null}>
          <VerifyEmailStatus />
        </Suspense>
      </div>
    </AuthShell>
  );
}
