import Link from "next/link";
import { BookOpen, Calendar } from "lucide-react";
import { listPublishedJournalIssues } from "@/lib/magazine";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function JournalPage() {
  let issues: Awaited<ReturnType<typeof listPublishedJournalIssues>> = [];
  try {
    issues = await listPublishedJournalIssues();
  } catch (error) {
    console.error("[JournalPage] Failed to fetch issues:", error);
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold tracking-tight mb-3">Журнал</h1>
        <p className="text-muted-foreground max-w-2xl">
          Архив опубликованных выпусков журнала с обложками и ссылками на материалы.
        </p>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-600">Пока нет опубликованных выпусков</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map((issue) => {
            const targetHref = issue.landingUrl || issue.pdfUrl || "/journal";

            return (
              <article
                key={issue.id}
                className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/5] bg-stone-100">
                  <img
                    src={issue.coverImageUrl}
                    alt={issue.coverAlt || issue.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(issue.publicationDate).toLocaleDateString("ru-RU")}</span>
                    {issue.issueNumber ? <span className="text-stone-400">• № {issue.issueNumber}</span> : null}
                  </div>

                  <h2 className="text-lg font-semibold leading-snug text-stone-900">{issue.title}</h2>

                  {issue.description ? (
                    <p className="text-sm text-stone-600 line-clamp-3">{issue.description}</p>
                  ) : null}

                  {(issue.landingUrl || issue.pdfUrl) && (
                    <Link
                      href={targetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      Открыть выпуск
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
