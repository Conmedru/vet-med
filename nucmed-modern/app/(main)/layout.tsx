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
    // overflow-x: clip keeps full-bleed rails (calc(50% - 50vw)) from adding a horizontal scrollbar
    <div className="relative isolate flex flex-1 flex-col overflow-x-clip">
      {/* Colour wash behind the glass surfaces, fixed so short and long pages look the same */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-[560px] w-[560px] rounded-full bg-[#7fe0ec] opacity-45 blur-[120px]" />
        <div className="absolute -right-32 top-24 h-[520px] w-[520px] rounded-full bg-[#b9b2ff] opacity-40 blur-[130px]" />
        <div className="absolute bottom-[-160px] left-1/3 h-[520px] w-[620px] rounded-full bg-[#a7f0c9] opacity-35 blur-[130px]" />
      </div>
      <Header trendingTags={trendingTags} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
