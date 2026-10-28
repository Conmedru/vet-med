"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BadgeCheck,
  MailWarning,
  Mail,
  CalendarPlus,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { PRIORITY_SPECIALTIES, OTHER_SPECIALTIES } from "@/lib/data/specialties";
import { MemberDetailDrawer } from "@/components/admin/member-detail-drawer";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface MemberRow {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName: string;
  specialty: string;
  specialtyOther: string | null;
  specialtyName: string;
  phone: string | null;
  country: string;
  city: string;
  interests: string[];
  emailVerified: boolean;
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  digestEnabled: boolean;
  consentMarketing: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  subscriptionsCount: number;
  sessionsCount: number;
}

const SPECIALTY_OPTIONS = [...PRIORITY_SPECIALTIES, ...OTHER_SPECIALTIES];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  DELETED: "Удалён",
};

export default function AdminMembersPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openId, setOpenId] = useState<string | null>(null);

  // Дебаунс поиска: печать в поле не должна порождать запрос на каждый символ
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      sortBy,
      sortDir,
    });
    if (debouncedQ) p.set("q", debouncedQ);
    if (status) p.set("status", status);
    if (verified) p.set("verified", verified);
    if (specialty) p.set("specialty", specialty);
    return p.toString();
  }, [page, perPage, sortBy, sortDir, debouncedQ, status, verified, specialty]);

  const { data, isLoading } = useSWR(`/api/admin/members?${query}`, fetcher, {
    keepPreviousData: true,
  });

  const members: MemberRow[] = data?.members ?? [];
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0, perPage };
  const stats = data?.stats;

  const hasFilters = Boolean(debouncedQ || status || verified || specialty);

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function resetFilters() {
    setQ("");
    setStatus("");
    setVerified("");
    setSpecialty("");
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-[1600px] p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </span>
          Пользователи
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Специалисты, зарегистрированные в личном кабинете портала.
        </p>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Всего" value={stats?.total} icon={Users} />
        <StatCard
          label="Email подтверждён"
          value={stats?.verified}
          sub={stats?.total ? `${Math.round((stats.verified / stats.total) * 100)}%` : undefined}
          icon={BadgeCheck}
          tone="green"
        />
        <StatCard
          label="Не подтверждён"
          value={stats ? stats.total - stats.verified : undefined}
          icon={MailWarning}
          tone="amber"
        />
        <StatCard label="Подписаны на дайджест" value={stats?.digest} icon={Mail} />
        <StatCard label="Новых за сутки" value={stats?.newDay} icon={CalendarPlus} tone="blue" />
        <StatCard label="Новых за неделю" value={stats?.newWeek} icon={CalendarPlus} tone="blue" />
      </div>

      {/* Top specialties / cities */}
      {stats && (stats.topSpecialties?.length > 0 || stats.topCities?.length > 0) && (
        <div className="mb-6 grid gap-3 lg:grid-cols-2">
          <FacetCard
            title="Специальности"
            items={stats.topSpecialties.map((s: any) => ({
              label: s.name,
              count: s.count,
              active: specialty === s.slug,
              onClick: () => {
                setSpecialty(specialty === s.slug ? "" : s.slug);
                setPage(1);
              },
            }))}
            total={stats.total}
          />
          <FacetCard
            title="Города"
            items={stats.topCities.map((c: any) => ({
              label: c.city,
              count: c.count,
              active: debouncedQ === c.city,
              onClick: () => setQ(debouncedQ === c.city ? "" : c.city),
            }))}
            total={stats.total}
          />
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: ФИО, email, телефон, город, страна, интерес…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "Все статусы" },
            { value: "ACTIVE", label: "Активные" },
            { value: "BLOCKED", label: "Заблокированные" },
            { value: "DELETED", label: "Удалённые" },
          ]}
        />

        <Select
          value={verified}
          onChange={(v) => {
            setVerified(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "Любой email" },
            { value: "yes", label: "Email подтверждён" },
            { value: "no", label: "Email не подтверждён" },
          ]}
        />

        <Select
          value={specialty}
          onChange={(v) => {
            setSpecialty(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "Все специальности" },
            ...SPECIALTY_OPTIONS.map((s) => ({ value: s.slug, label: s.name })),
            { value: "other", label: "Другая специальность" },
          ]}
        />

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="whitespace-nowrap rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-left">
                <Th onClick={() => toggleSort("lastName")} active={sortBy === "lastName"} dir={sortDir}>
                  Специалист
                </Th>
                <Th>Специальность</Th>
                <Th>Локация</Th>
                <Th>Интересы</Th>
                <Th className="text-center">Подписки</Th>
                <Th onClick={() => toggleSort("loginCount")} active={sortBy === "loginCount"} dir={sortDir} className="text-center">
                  Входов
                </Th>
                <Th onClick={() => toggleSort("lastLoginAt")} active={sortBy === "lastLoginAt"} dir={sortDir}>
                  Последний вход
                </Th>
                <Th onClick={() => toggleSort("createdAt")} active={sortBy === "createdAt"} dir={sortDir}>
                  Регистрация
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-stone-400" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-stone-500">
                    {hasFilters ? "Ничего не найдено — попробуйте изменить фильтры." : "Пока нет зарегистрированных специалистов."}
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setOpenId(m.id)}
                    className="cursor-pointer border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50/70"
                  >
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="flex items-start gap-3">
                        <Avatar firstName={m.firstName} lastName={m.lastName} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-stone-900">
                              {m.lastName} {m.firstName} {m.middleName}
                            </span>
                            <span
                              className="shrink-0"
                              title={m.emailVerified ? "Email подтверждён" : "Email не подтверждён"}
                            >
                              {m.emailVerified ? (
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <MailWarning className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </span>
                          </div>
                          <div className="truncate text-xs text-stone-500">{m.email}</div>
                          {m.status !== "ACTIVE" && (
                            <span className="mt-1 inline-block rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                              {STATUS_LABELS[m.status]}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="line-clamp-2 text-stone-700">{m.specialtyName}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <div className="truncate">{m.city}</div>
                      <div className="truncate text-xs text-stone-400">{m.country}</div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {m.interests.length === 0 ? (
                        <span className="text-stone-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {m.interests.slice(0, 2).map((i) => (
                            <span
                              key={i}
                              className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600"
                            >
                              {i}
                            </span>
                          ))}
                          {m.interests.length > 2 && (
                            <span className="text-[11px] text-stone-400">
                              +{m.interests.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.subscriptionsCount > 0 ? (
                        <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          {m.subscriptionsCount}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-stone-600">{m.loginCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      {m.lastLoginAt ? (
                        <>
                          <div>{format(new Date(m.lastLoginAt), "d MMM yyyy", { locale: ru })}</div>
                          <div className="text-xs text-stone-400">
                            {format(new Date(m.lastLoginAt), "HH:mm")}
                          </div>
                        </>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      <div>{format(new Date(m.createdAt), "d MMM yyyy", { locale: ru })}</div>
                      <div className="text-xs text-stone-400">
                        {format(new Date(m.createdAt), "HH:mm")}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/50 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>
              {pagination.total > 0
                ? `${(pagination.page - 1) * pagination.perPage + 1}–${Math.min(
                    pagination.page * pagination.perPage,
                    pagination.total
                  )} из ${pagination.total}`
                : "0 записей"}
            </span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:outline-none"
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} на странице
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs text-stone-600">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <MemberDetailDrawer memberId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "stone",
}: {
  label: string;
  value?: number;
  sub?: string;
  icon: React.ElementType;
  tone?: "stone" | "green" | "amber" | "blue";
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-500",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {sub && <span className="text-xs text-stone-400">{sub}</span>}
      </div>
      <div className="text-2xl font-bold tabular-nums text-stone-900">
        {value === undefined ? <span className="text-stone-300">—</span> : value}
      </div>
      <div className="mt-0.5 text-xs leading-tight text-stone-500">{label}</div>
    </div>
  );
}

function FacetCard({
  title,
  items,
  total,
}: {
  title: string;
  items: { label: string; count: number; active: boolean; onClick: () => void }[];
  total: number;
}) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">{title}</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={cn(
              "group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
              item.active ? "bg-primary/10" : "hover:bg-stone-50"
            )}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-lg bg-stone-100/70 transition-all group-hover:bg-stone-200/60"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
            <span className={cn("relative truncate", item.active ? "font-medium text-primary" : "text-stone-700")}>
              {item.label}
            </span>
            <span className="relative shrink-0 text-xs tabular-nums text-stone-500">
              {item.count}
              {total > 0 && (
                <span className="ml-1 text-stone-400">{Math.round((item.count / total) * 100)}%</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  className,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500",
        onClick && "cursor-pointer select-none hover:text-stone-800",
        className
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && (
          <ArrowUpDown
            className={cn("h-3 w-3", active ? "text-stone-800" : "text-stone-300")}
          />
        )}
        {active && <span className="text-[10px] text-stone-400">{dir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${lastName[0] ?? ""}${firstName[0] ?? ""}`.toUpperCase();
  // Стабильный цвет из инициалов — карточки различимы взглядом при скролле
  const hue = ((initials.charCodeAt(0) || 0) * 37 + (initials.charCodeAt(1) || 0) * 17) % 360;
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
      style={{ background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 45% 35%)` }}
    >
      {initials}
    </span>
  );
}
