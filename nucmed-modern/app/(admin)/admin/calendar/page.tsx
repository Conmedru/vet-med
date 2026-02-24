"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScheduledArticle {
  id: string;
  title?: string;
  titleOriginal: string;
  scheduledAt: string;
  category?: string;
  source?: { name: string };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [articles, setArticles] = useState<ScheduledArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScheduledArticles();
  }, []);

  async function loadScheduledArticles() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/articles?status=SCHEDULED&take=100");
      const data = await response.json();
      setArticles(data.items || []);
    } catch (error) {
      console.error("Failed to load scheduled articles:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function getArticlesForDay(day: number): ScheduledArticle[] {
    return articles.filter((article) => {
      const scheduledDate = new Date(article.scheduledAt);
      return (
        scheduledDate.getFullYear() === year &&
        scheduledDate.getMonth() === month &&
        scheduledDate.getDate() === day
      );
    });
  }

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];
  
  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold">Календарь публикаций</h1>
        <p className="text-muted-foreground mt-1">
          {articles.length} запланированных статей
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-xl">
            {monthNames[month]} {year}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-[100px]" />;
                }

                const dayArticles = getArticlesForDay(day);

                return (
                  <div
                    key={day}
                    className={`min-h-[100px] p-1 border rounded-lg ${
                      isToday(day) ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday(day) ? "text-primary" : ""
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayArticles.slice(0, 3).map((article) => (
                        <Link
                          key={article.id}
                          href={`/admin/articles/${article.id}`}
                          className="block p-1 text-xs bg-purple-100 text-purple-700 rounded truncate hover:bg-purple-200 transition-colors"
                          title={article.title || article.titleOriginal}
                        >
                          {formatTime(article.scheduledAt)} {article.title?.slice(0, 20) || article.titleOriginal.slice(0, 20)}...
                        </Link>
                      ))}
                      {dayArticles.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayArticles.length - 3} ещё
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming list */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Ближайшие публикации</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Нет запланированных публикаций
            </p>
          ) : (
            <div className="divide-y">
              {articles
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .slice(0, 10)
                .map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {article.title || article.titleOriginal}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(article.scheduledAt)}
                        {article.category && (
                          <span className="text-primary">• {article.category}</span>
                        )}
                      </div>
                    </div>
                    <Link href={`/admin/articles/${article.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
