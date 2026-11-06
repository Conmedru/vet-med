import { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { NewsletterForm } from "@/components/shared";

export const metadata: Metadata = {
  title: "Дайджест для ветеринарного врача",
  description: "Еженедельная рассылка CON-VET.ru: главные новости, исследования и клинические случаи ветеринарной медицины. Бесплатно.",
};

/** «Только рассылка» from the home page: subscription without an account (list vet-digest) */
export default function NewsletterPage() {
  return (
    <AuthShell
      title="Дайджест для ветеринарного врача"
      description="Раз в неделю — главное из ветеринарной медицины: новости, исследования, клинические случаи. Бесплатно, отписаться можно в любом письме."
    >
      <NewsletterForm />
      <p className="mt-6 text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
        Хотите дайджест по своим специализациям и персональную ленту?{" "}
        <Link href="/register?redirect=%2Faccount" className="font-medium" style={{ color: "var(--ink)" }}>
          Зарегистрируйтесь
        </Link>
      </p>
    </AuthShell>
  );
}
