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
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badgeKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/admin/queue", label: "Очередь", icon: FileText, badgeKey: "unreadCount" },
  { href: "/admin/articles/new", label: "Новая статья", icon: PenSquare },
  { href: "/admin/sources", label: "Источники", icon: Rss },
  { href: "/admin/images", label: "Изображения", icon: ImageIcon },
  { href: "/admin/journal", label: "Журнал", icon: BookOpen },
  { href: "/admin/newsletter", label: "Рассылка", icon: Mail },
  { href: "/admin/sponsored", label: "Реклама", icon: Megaphone },
  { href: "/admin/calendar", label: "Календарь", icon: Calendar },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

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
          <img src="/logo.png" alt="CON-VET.ru" className="h-9 w-auto" />
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-white border-r border-stone-200/60 z-40 transition-transform lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6">
          <Link href="/admin" className="flex items-center">
            <img src="/logo.png" alt="CON-VET.ru" className="h-11 w-auto" />
          </Link>
          <div className="text-xs text-stone-400 mt-2">Панель управления</div>
        </div>

        {/* User Profile Snippet */}
        {user && (
          <div className="px-6 mb-6">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                <User className="h-4 w-4 text-stone-500" />
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-medium text-stone-900 truncate">{user.name || "User"}</div>
                <div className="text-xs text-stone-500 truncate">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const badgeCount = item.badgeKey === "unreadCount" ? unreadCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20"
                    : "text-stone-600 hover:bg-stone-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={cn(
                    "min-w-5 h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-primary text-white"
                  )}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-stone-100">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 transition-all mb-1"
          >
            <Home className="h-5 w-5" />
            На сайт
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Выйти
          </button>
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
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
