import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/member-session";
import { AccountView } from "@/components/account/account-view";

export const metadata: Metadata = {
  title: "Личный кабинет",
};

const TABS = ["feed", "digest", "profile"] as const;

/** ?tab=digest: the «Настроить подписку» link of the digest letter opens its tab */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab) ?? "feed";
  const member = await getCurrentMember();
  if (!member) {
    redirect(`/login?redirect=${encodeURIComponent(initialTab === "feed" ? "/account" : `/account?tab=${initialTab}`)}`);
  }

  return <AccountView initialTab={initialTab} />;
}
