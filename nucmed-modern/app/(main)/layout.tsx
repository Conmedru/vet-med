import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getTrendingTags } from "@/lib/articles";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trendingTags = await getTrendingTags();

  return (
    <>
      <Header trendingTags={trendingTags} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
