import { Metadata } from "next";
import { Search } from "@/components/search";

export const metadata: Metadata = {
  title: "Поиск статей | VetMed",
  description: "Поиск по статьям о ветеринарной медицине",
};

export default function SearchPage() {
  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight mb-4">
          Поиск статей
        </h1>
        <p className="text-muted-foreground text-lg">
          Найдите интересующие вас статьи о ветеринарной медицине
        </p>
      </div>
      
      <Search />
    </div>
  );
}
