import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/member-session";
import { AccountView } from "@/components/account/account-view";

export const metadata: Metadata = {
  title: "Личный кабинет",
};

export default async function AccountPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/login?redirect=/account");
  }

  return <AccountView />;
}
