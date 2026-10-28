"use client";

import { useEffect } from "react";
import { RUBRIC_KIND_LABELS, type RubricKind } from "@/lib/rubrics";
import useSWR from "swr";
import {
  X,
  Loader2,
  BadgeCheck,
  MailWarning,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Monitor,
  Clock,
  Copy,
  Check,
  Tag,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());


const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  BLOCKED: "bg-red-50 text-red-700",
  DELETED: "bg-stone-100 text-stone-600",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  DELETED: "Удалён",
};

/**
 * Боковая панель с полной карточкой специалиста.
 * Данные грузятся отдельным запросом по id — список остаётся лёгким,
 * а тяжёлые связи (сессии, подписки) приходят только при открытии.
 */
export function MemberDetailDrawer({
  memberId,
  onClose,
}: {
  memberId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR(
    memberId ? `/api/admin/members/${memberId}` : null,
    fetcher
  );
  const member = data?.member;

  // Esc закрывает панель, скролл body блокируется — иначе фон уезжает под панелью
  useEffect(() => {
    if (!memberId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [memberId, onClose]);

  if (!memberId) return null;

  const rubricGroups = (Object.keys(RUBRIC_KIND_LABELS) as RubricKind[])
    .map((kind) => ({ kind, items: member?.subscriptions?.filter((s: any) => s.rubric.kind === kind) ?? [] }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-stone-900/20 backdrop-blur-[2px] animate-in fade-in duration-150"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-stone-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {isLoading || !member ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-6">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      STATUS_STYLES[member.status]
                    )}
                  >
                    {STATUS_LABELS[member.status]}
                  </span>
                  {member.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <BadgeCheck className="h-3 w-3" /> Email подтверждён
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <MailWarning className="h-3 w-3" /> Email не подтверждён
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold leading-tight text-stone-900">
                  {member.lastName} {member.firstName} {member.middleName}
                </h2>
                <p className="mt-0.5 text-sm text-stone-500">{member.specialtyName}</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Quick metrics */}
              <div className="mb-6 grid grid-cols-3 gap-2">
                <Metric label="Входов" value={member.loginCount} />
                <Metric label="Рубрик" value={member.subscriptions?.length ?? 0} />
                <Metric
                  label="Сессий"
                  value={member.sessions?.filter((s: any) => s.isActive).length ?? 0}
                />
              </div>

              {/* Contacts */}
              <Section title="Контакты" icon={Mail}>
                <Row label="E-mail" value={member.email} copyable />
                <Row label="Телефон" value={member.phone} copyable icon={Phone} />
                <Row
                  label="Локация"
                  value={`${member.city}, ${member.country}`}
                  icon={MapPin}
                />
              </Section>

              {/* Professional */}
              <Section title="Профессиональные данные" icon={Stethoscope}>
                <Row label="Специальность" value={member.specialtyName} />
                {member.specialty === "other" && member.specialtyOther && (
                  <Row label="Уточнение" value={member.specialtyOther} />
                )}
                <Row label="Slug" value={member.specialty} mono />
              </Section>

              {/* Interests */}
              <Section title="Профессиональные интересы" icon={Sparkles}>
                {member.interests?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {member.interests.map((i: string) => (
                      <span
                        key={i}
                        className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Empty>Не указаны</Empty>
                )}
              </Section>

              {/* Feed settings */}
              <Section title="Настройки ленты и дайджеста" icon={Layers}>
                <Row
                  label="Еженедельный дайджест"
                  value={member.digestEnabled ? "Подписан" : "Отключён"}
                  tone={member.digestEnabled ? "green" : "muted"}
                />
              </Section>

              {/* Subscriptions */}
              <Section title={`Рубрики ленты (${member.subscriptions?.length ?? 0})`} icon={Tag}>
                {member.subscriptions?.length === 0 ? (
                  <Empty>Не выбраны — видит все материалы</Empty>
                ) : (
                  <div className="space-y-3">
                    {rubricGroups.map((group) => (
                      <RubricGroup key={group.kind} title={RUBRIC_KIND_LABELS[group.kind]} items={group.items} />
                    ))}
                  </div>
                )}
              </Section>

              {/* Consents */}
              <Section title="Согласия" icon={ShieldCheck}>
                <Consent ok={member.consentHealthcare} label="Специалист здравоохранения" />
                <Consent ok={member.consentPd152} label="Обработка ПД (152-ФЗ)" />
                <Consent ok={member.consentPd156} label="Передача ПД третьим лицам (156-ФЗ)" />
                <Consent ok={member.consentMarketing} label="Получение рассылок" optional />
                {member.consentedAt && (
                  <Row
                    label="Дата согласия"
                    value={format(new Date(member.consentedAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                  />
                )}
              </Section>

              {/* Timeline */}
              <Section title="Активность" icon={Clock}>
                <Row
                  label="Регистрация"
                  value={format(new Date(member.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                />
                <Row
                  label="Email подтверждён"
                  value={
                    member.emailVerifiedAt
                      ? format(new Date(member.emailVerifiedAt), "d MMMM yyyy, HH:mm", { locale: ru })
                      : null
                  }
                />
                <Row
                  label="Последний вход"
                  value={
                    member.lastLoginAt
                      ? format(new Date(member.lastLoginAt), "d MMMM yyyy, HH:mm", { locale: ru })
                      : null
                  }
                />
                <Row label="Всего входов" value={String(member.loginCount)} />
                <Row
                  label="Обновлён"
                  value={format(new Date(member.updatedAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                />
                <Row label="ID" value={member.id} mono copyable />
              </Section>

              {/* Sessions */}
              <Section title={`Сессии (${member.sessions?.length ?? 0})`} icon={Monitor}>
                {member.sessions?.length === 0 ? (
                  <Empty>Активных сессий нет</Empty>
                ) : (
                  <div className="space-y-2">
                    {member.sessions.map((s: any) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-stone-200 bg-stone-50/50 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              s.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-stone-200 text-stone-600"
                            )}
                          >
                            {s.isActive ? "Активна" : "Истекла"}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {format(new Date(s.lastUsedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                          </span>
                        </div>
                        <div className="truncate text-xs text-stone-600" title={s.userAgent ?? ""}>
                          {parseUserAgent(s.userAgent)}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-stone-400">
                          {s.ipAddress ?? "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-stone-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  copyable,
  icon: Icon,
  tone,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
  icon?: React.ElementType;
  tone?: "green" | "muted";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="shrink-0 text-xs text-stone-500">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 shrink-0 text-stone-300" />}
        {value ? (
          <span
            className={cn(
              "truncate text-sm",
              mono && "font-mono text-xs",
              tone === "green" && "font-medium text-emerald-600",
              tone === "muted" && "text-stone-400",
              !tone && "text-stone-800"
            )}
            title={value}
          >
            {value}
          </span>
        ) : (
          <span className="text-sm text-stone-300">—</span>
        )}
        {copyable && value && (
          <button
            onClick={copy}
            className="shrink-0 rounded p-0.5 text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-600"
            title="Скопировать"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-center">
      <div className="text-xl font-bold tabular-nums text-stone-900">{value}</div>
      <div className="text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function Consent({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded",
          ok ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400"
        )}
      >
        {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      </span>
      <span className={cn("text-sm", ok ? "text-stone-800" : "text-stone-400")}>{label}</span>
      {optional && <span className="text-[10px] text-stone-400">(опционально)</span>}
    </div>
  );
}

function RubricGroup({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {title} · {items.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s.id}
            className="rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-700"
          >
            {s.rubric.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-stone-400">{children}</span>;
}

/** Короткое человекочитаемое описание клиента вместо сырого UA-строки. */
function parseUserAgent(ua: string | null): string {
  if (!ua) return "Неизвестное устройство";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "—";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /YaBrowser/.test(ua)
      ? "Yandex"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "—";
  return `${browser} · ${os}`;
}
