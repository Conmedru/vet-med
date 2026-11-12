"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import useSWR from "swr";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Rss,
  PenSquare,
  ImageIcon,
  Mail,
  User,
  Megaphone,
  BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badgeKey?: "unreadCount";
}

/*
 * Menu by groups, as on onco-compass: content, what is visible on the site, catalog setup.
 * «Новая статья» is a button above the menu (an action, not a section); settings,
 * the link to the site and the profile with logout stay at the bottom.
 */
const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    title: "Контент",
    items: [
      { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
      { href: "/admin/queue", label: "Очередь", icon: FileText, badgeKey: "unreadCount" },
      { href: "/admin/calendar", label: "Календарь публикаций", icon: Calendar },
      { href: "/admin/journal", label: "Журнал", icon: BookOpen },
      { href: "/admin/images", label: "Изображения", icon: ImageIcon },
    ],
  },
  {
    title: "Сайт",
    items: [
      { href: "/admin/events", label: "Мероприятия", icon: CalendarDays },
      { href: "/admin/sponsored", label: "Реклама", icon: Megaphone },
      { href: "/admin/newsletter", label: "Рассылка", icon: Mail },
    ],
  },
  {
    title: "Структура",
    items: [{ href: "/admin/sources", label: "Источники", icon: Rss }],
  },
  { items: [{ href: "/admin/members", label: "Пользователи", icon: Users }] },
];

const itemClass = (active: boolean) =>
  cn(
    "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
    active ? "bg-stone-100 font-medium text-stone-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
  );
const iconClass = (active: boolean) =>
  cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-stone-400 group-hover:text-stone-600");

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // If we are on the auth page, render without layout
  const isAuthPage = pathname === "/admin/auth";

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/auth");
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setUser(data.user);
          } else {
            router.push("/admin/auth");
          }
        } else {
          router.push("/admin/auth");
        }
      } catch (error) {
        console.error("Auth check failed", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isAuthPage, router]);

  // Fetch unread article count using SWR for global revalidation
  const { data: unreadData } = useSWR(
    isAuthPage ? null : "/api/articles/unread-count",
    fetcher,
    { refreshInterval: 30000 }
  );

  const unreadCount = unreadData?.count || 0;

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/auth");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (isAuthPage) {
    return (
      <>
        <Toaster position="top-right" richColors closeButton />
        {children}
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 z-50 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl hover:bg-stone-100 transition-colors"
        >
          {sidebarOpen ? <X className="h-5 w-5 text-stone-600" /> : <Menu className="h-5 w-5 text-stone-600" />}
        </button>
        <div className="ml-3 flex items-center">
          <img src="/con-vet-logo.png" alt="CON-VET.ru Logo" className="h-8 w-auto" />
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-stone-200/70 z-40 transition-transform lg:translate-x-0 flex flex-col pt-16 lg:pt-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="shrink-0 px-5 pt-5 pb-4">
          <Link href="/admin" className="hidden lg:block">
            <img src="/con-vet-logo.png" alt="CON-VET.ru" className="h-7 w-auto" />
          </Link>
          <div className="mt-1.5 hidden text-[11px] uppercase lg:block tracking-[0.08em] text-stone-400">Панель управления</div>
          <Link
            href="/admin/articles/new"
            onClick={() => setSidebarOpen(false)}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            <PenSquare className="h-4 w-4" />
            Новая статья
          </Link>
        </div>

        {/* Menu scrolls on its own: the bottom of the panel stays on screen */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-4")}>
              {group.title && (
                <div className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">{group.title}</div>
              )}
              <div className="space-y-px">
                {group.items.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const badgeCount = item.badgeKey === "unreadCount" ? unreadCount : 0;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={itemClass(isActive)}>
                      <item.icon className={iconClass(isActive)} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold tabular-nums text-amber-800">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-px border-t border-stone-100 px-3 py-3">
          <Link href="/admin/settings" onClick={() => setSidebarOpen(false)} className={itemClass(pathname.startsWith("/admin/settings"))}>
            <Settings className={iconClass(pathname.startsWith("/admin/settings"))} />
            Настройки
          </Link>
          <Link href="/" target="_blank" className={itemClass(false)}>
            <Home className={iconClass(false)} />
            На сайт
          </Link>
          {user && (
            <div className="mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100">
                <User className="h-3.5 w-3.5 text-stone-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-stone-800">{user.name || user.email}</div>
                {user.name && <div className="truncate text-[11px] text-stone-400">{user.email}</div>}
              </div>
              <button onClick={handleLogout} title="Выйти" aria-label="Выйти" className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
