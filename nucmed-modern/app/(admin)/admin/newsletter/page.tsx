"use client";

import { useState, useEffect } from "react";
import { 
  Mail, 
  Eye, 
  Send, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Users,
  History,
  LayoutDashboard,
  FileText,
  Settings,
  Clock,
  Save
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

// Types
interface Stats {
  subscribers: {
    total: number;
    active: number;
    digest?: number;
    listDetails?: any;
  };
  campaigns: {
    total: number;
    lastSent?: {
      subject: string;
      sentAt: string;
      stats?: any;
    } | null;
  };
}

interface Campaign {
  id: string;
  subject: string;
  type: string;
  status: string;
  sentAt: string | null;
  recipientCount: number;
  metadata: any;
  createdAt: string;
  externalId?: string;
  stats?: {
    total?: number;
    sent?: number;
    delivered?: number;
    read_unique?: number;
    clicked_unique?: number;
    [key: string]: any;
  };
}

export default function AdminNewsletterPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "digest" | "notifications" | "subscribers">("overview");
  
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Управление рассылкой</h1>
        <p className="text-stone-500 mt-2">Дайджесты, уведомления и статистика</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl mb-8 w-fit overflow-x-auto">
        <TabButton 
          active={activeTab === "overview"} 
          onClick={() => setActiveTab("overview")}
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Обзор"
        />
        <TabButton 
          active={activeTab === "digest"} 
          onClick={() => setActiveTab("digest")}
          icon={<FileText className="w-4 h-4" />}
          label="Дайджест"
        />
        <TabButton 
          active={activeTab === "notifications"} 
          onClick={() => setActiveTab("notifications")}
          icon={<Bell className="w-4 h-4" />}
          label="Уведомления"
        />
        <TabButton 
          active={activeTab === "subscribers"} 
          onClick={() => setActiveTab("subscribers")}
          icon={<Users className="w-4 h-4" />}
          label="Подписчики"
        />
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "overview" && <OverviewTab changeTab={setActiveTab} />}
        {activeTab === "digest" && <DigestTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "subscribers" && <SubscribersTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
        ${active 
          ? "bg-white text-stone-900 shadow-sm ring-1 ring-black/5" 
          : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Tabs Components ---

function OverviewTab({ changeTab }: { changeTab: (tab: "overview" | "digest" | "notifications" | "subscribers") => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/newsletter/stats")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.subscribers && data.campaigns) {
          setStats(data);
        }
      })
      .catch(err => console.error("Failed to load newsletter stats:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div></div>;
  if (!stats) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">Не удалось загрузить данные статистики</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => changeTab("subscribers")} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard 
            title="Подписчиков" 
            value={stats.subscribers.active} 
            icon={<Users className="w-5 h-5 text-emerald-600" />}
            trend={`${stats.subscribers.total} всего`}
            />
        </div>
        <div onClick={() => changeTab("subscribers")} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard 
            title="Дайджест" 
            value={stats.subscribers.digest || 0} 
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            trend="Еженедельная рассылка"
            />
        </div>
        <div onClick={() => changeTab("digest")} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <StatCard 
            title="Кампаний" 
            value={stats.campaigns.total} 
            icon={<Mail className="w-5 h-5 text-purple-600" />}
            trend="Отправлено"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h3 className="font-semibold text-stone-900 mb-4">Быстрые действия</h3>
            <div className="space-y-3">
                <button 
                    onClick={() => changeTab("digest")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-200 transition-colors">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-stone-900">Управление дайджестом</p>
                            <p className="text-sm text-stone-500">Настройка расписания и ручная отправка</p>
                        </div>
                    </div>
                    <div className="text-stone-400 group-hover:translate-x-1 transition-transform">→</div>
                </button>
                <button 
                    onClick={() => changeTab("notifications")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-200 transition-colors">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-stone-900">Отправить уведомление</p>
                            <p className="text-sm text-stone-500">Разовая рассылка о важном событии</p>
                        </div>
                    </div>
                    <div className="text-stone-400 group-hover:translate-x-1 transition-transform">→</div>
                </button>
            </div>
        </div>

        {/* Last Campaign */}
        {stats.campaigns.lastSent ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-stone-500" />
                Последняя отправка
            </h3>
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-100">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-medium text-lg text-stone-900 leading-tight mb-2">{stats.campaigns.lastSent.subject}</p>
                        <p className="text-stone-500 text-sm flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(stats.campaigns.lastSent.sentAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                        Отправлено
                    </span>
                </div>
            </div>
            </div>
        ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center justify-center text-stone-400">
                Нет данных о последних кампаниях
            </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string; value: number | string; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-stone-500 font-medium text-sm">{title}</span>
        <div className="p-2 bg-stone-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-stone-900">{value}</span>
        {trend && <span className="text-stone-400 text-sm mb-1.5">{trend}</span>}
      </div>
    </div>
  );
}

function DigestTab() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState({
    enabled: true,
    dayOfWeek: 1,
    hour: 9,
    timezone: "Europe/Moscow"
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/newsletter/settings")
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
            setSettings(data);
        }
      })
      .catch(console.error)
      .finally(() => setSettingsLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/newsletter/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        alert("Настройки расписания сохранены");
      } else {
        alert("Ошибка при сохранении");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка сети");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleGenerate = async (sendImmediately = false) => {
    if (sendImmediately) {
        if (!confirm("Вы уверены, что хотите отправить дайджест подписчикам прямо сейчас?")) return;
        setSending(true);
    } else {
        setGenerating(true);
    }

    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekOffset, send: sendImmediately }),
      });
      const data = await res.json();
      if (data.success) {
        if (sendImmediately) {
          alert(`Дайджест успешно отправлен! (${data.digest.articleCount} статей)`);
        } else {
          alert(`Дайджест сгенерирован: ${data.digest.articleCount} статей`);
        }
      } else {
        alert(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Failed to process digest:", error);
      alert("Ошибка при обработке запроса");
    } finally {
      setGenerating(false);
      setSending(false);
    }
  };

  const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Verification Warning */}
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
              <h3 className="text-sm font-semibold text-amber-800">Требуется проверка отправителя</h3>
              <p className="text-sm text-amber-700 mt-1">
                  Для корректной отправки рассылок убедитесь, что email <strong>info@nucmed.ru</strong> (или другой, указанный в настройках) верифицирован в личном кабинете Unisender. Иначе рассылки будут возвращаться с ошибкой "The email has not been checked yet".
              </p>
              <a href="https://cp.unisender.com/ru/v5/settings/senders" target="_blank" className="text-xs font-medium text-amber-800 underline mt-2 inline-block">Перейти к настройке отправителей →</a>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Automation Settings Card */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 p-6 flex flex-col h-full">
            <h2 className="text-lg font-semibold text-stone-900 mb-1">Автоматическая рассылка</h2>
            <p className="text-sm text-stone-500 mb-6">Настройте регулярную отправку дайджеста</p>

            {settingsLoading ? (
                 <div className="flex-1 flex justify-center items-center"><div className="w-6 h-6 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-6 flex-1">
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="flex flex-col">
                            <span className="font-medium text-stone-900">Статус</span>
                            <span className={`text-xs font-medium mt-1 ${settings.enabled ? "text-emerald-600" : "text-stone-400"}`}>
                                {settings.enabled ? "Активна" : "На паузе"}
                            </span>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={settings.enabled}
                                onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                            />
                            <div className={`h-6 w-11 rounded-full transition-colors ${settings.enabled ? 'bg-emerald-500' : 'bg-stone-200'}`}></div>
                            <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    <div className={`space-y-4 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">День недели</label>
                            <select 
                                value={settings.dayOfWeek}
                                onChange={(e) => setSettings({...settings, dayOfWeek: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                {days.map((d, i) => (
                                    <option key={i} value={i}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Время (МСК)</label>
                            <select 
                                value={settings.hour}
                                onChange={(e) => setSettings({...settings, hour: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="pt-2">
                             <p className="text-xs text-stone-400 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                Следующая отправка: 
                                <span className="font-medium text-stone-600">
                                    {/* Simplified calculation logic for display */}
                                    {days[settings.dayOfWeek]}, {settings.hour}:00
                                </span>
                             </p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-stone-100">
                 <button
                    onClick={handleSaveSettings}
                    disabled={settingsSaving}
                    className="w-full py-2.5 bg-stone-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-70 text-sm"
                >
                    {settingsSaving ? "Сохранение..." : "Сохранить настройки"}
                </button>
            </div>
          </div>

          {/* Manual Generation Card */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="text-lg font-semibold text-stone-900 mb-1">Ручная отправка</h2>
                <p className="text-sm text-stone-500 mb-6">Сгенерируйте и отправьте дайджест вне расписания</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Период выборки новостей</label>
                        <div className="relative max-w-sm">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <select
                            value={weekOffset}
                            onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value={0}>Эта неделя (текущая)</option>
                            <option value={1}>Прошлая неделя</option>
                            <option value={2}>2 недели назад</option>
                            <option value={3}>3 недели назад</option>
                        </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={() => setPreviewUrl(`/api/admin/newsletter/preview?weekOffset=${weekOffset}`)}
                            className="flex-1 lg:flex-none px-6 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Eye className="h-4 w-4" />
                            Предпросмотр
                        </button>
                        <div className="h-8 w-px bg-stone-200 mx-2 hidden lg:block"></div>
                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={generating || sending}
                            className="flex-1 lg:flex-none px-6 py-2.5 bg-white border border-emerald-500 text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                            {generating ? "Генерация..." : "Только сохранить"}
                        </button>
                        <button
                            onClick={() => handleGenerate(true)}
                            disabled={generating || sending}
                            className="flex-1 lg:flex-none px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            <Send className={`h-4 w-4 ${sending ? "animate-pulse" : ""}`} />
                            {sending ? "Отправка..." : "Отправить сейчас"}
                        </button>
                    </div>
                </div>
             </div>

             {/* Preview Area */}
             {previewUrl && (
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
                    <span className="font-medium text-stone-700 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-stone-400" />
                        Предпросмотр письма
                    </span>
                    <div className="flex gap-4">
                        <a href={previewUrl} target="_blank" className="text-sm text-stone-500 hover:text-stone-900 underline decoration-stone-300 underline-offset-4">Открыть в новой вкладке</a>
                        <button
                        onClick={() => setPreviewUrl(null)}
                        className="text-sm text-stone-500 hover:text-red-600 transition-colors"
                        >
                        Закрыть
                        </button>
                    </div>
                </div>
                <iframe
                    src={previewUrl}
                    className="w-full h-[600px] bg-white"
                    title="Preview"
                />
                </div>
            )}
            
            {/* History Table */}
            <HistoryTab />
          </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Bell className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">Уведомления в разработке</h2>
      <p className="text-stone-500 max-w-md mx-auto">
        Функционал отправки разовых уведомлений (например, о выходе важной статьи) будет доступен в ближайшем обновлении.
      </p>
    </div>
  );
}

function HistoryTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/newsletter/campaigns")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setCampaigns(data.campaigns || []))
      .catch(err => console.error("Failed to load campaigns:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div></div>;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
        <h2 className="font-semibold text-stone-900">История отправленных дайджестов</h2>
        <span className="text-xs text-stone-400 bg-white px-2 py-1 rounded-md border border-stone-200 shadow-sm">Последние 50</span>
      </div>
      
      {campaigns.length === 0 ? (
        <div className="p-12 text-center text-stone-500">
            <History className="w-12 h-12 mx-auto mb-3 text-stone-200" />
            <p>История пуста. Отправьте первый дайджест!</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
          {campaigns.filter(c => c.type === 'DIGEST').map((camp) => (
            <div key={camp.id} className="p-6 hover:bg-stone-50 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(camp.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  <h3 className="font-medium text-stone-900 group-hover:text-emerald-700 transition-colors">{camp.subject}</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  camp.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}>
                  {camp.status === 'SENT' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {camp.status === 'SENT' ? 'Отправлено' : camp.status}
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                {camp.stats ? (
                  <>
                    <div className="flex flex-col">
                      <span className="text-stone-500 text-xs uppercase font-medium">Отправлено</span>
                      <span className="font-semibold text-stone-900">{camp.stats.sent || camp.stats.total || camp.recipientCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-stone-500 text-xs uppercase font-medium">Открытия</span>
                      <div className="flex items-end gap-1">
                        <span className="font-semibold text-stone-900">{camp.stats.read_unique || 0}</span>
                        <span className="text-stone-400 text-xs mb-0.5">
                          ({camp.stats.sent ? Math.round(((camp.stats.read_unique || 0) / camp.stats.sent) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-stone-500 text-xs uppercase font-medium">Клики</span>
                      <div className="flex items-end gap-1">
                        <span className="font-semibold text-stone-900">{camp.stats.clicked_unique || 0}</span>
                        <span className="text-stone-400 text-xs mb-0.5">
                          ({camp.stats.read_unique ? Math.round(((camp.stats.clicked_unique || 0) / camp.stats.read_unique) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-stone-500 text-xs uppercase font-medium">Получателей</span>
                    <span className="font-semibold text-stone-900">{camp.recipientCount}</span>
                  </div>
                )}
                
                <div className="flex flex-col ml-auto text-right">
                   <span className="text-stone-400 text-xs font-mono">ID: {camp.externalId || '-'}</span>
                </div>
              </div>

              {camp.status === 'FAILED' && camp.metadata?.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 font-mono break-all">
                    <span className="font-bold block mb-1">Ошибка отправки:</span>
                    {camp.metadata.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SubscriberData {
  id: string;
  email: string;
  categories: string[];
  digestEnabled: boolean;
  status: string;
  createdAt: string;
}

interface SubscriberStats {
  total: number;
  active: number;
  digest: number;
  byCategory: { category: string; count: number }[];
}

function SubscribersTab() {
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = (p = 1, q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "30" });
    if (q) params.set("search", q);
    fetch(`/api/admin/newsletter/subscribers?${params}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.stats) setStats(data.stats);
        setSubscribers(data.subscribers || []);
        setTotalPages(data.pagination?.pages || 1);
        setPage(data.pagination?.page || 1);
      })
      .catch(err => console.error("Failed to load subscribers:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = () => { fetchData(1, search); };

  if (loading && !stats) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-stone-500 text-sm font-medium">Всего</span>
              <Users className="w-5 h-5 text-stone-400" />
            </div>
            <span className="text-3xl font-bold text-stone-900">{stats.total}</span>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-stone-500 text-sm font-medium">Активных</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-3xl font-bold text-emerald-600">{stats.active}</span>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-stone-500 text-sm font-medium">Дайджест</span>
              <Mail className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-3xl font-bold text-purple-600">{stats.digest}</span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && stats.byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-semibold text-stone-900 mb-4">Подписки по нозологиям</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.byCategory.map(({ category, count }) => (
              <div key={category} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-700 truncate mr-2">{category}</span>
                <span className="text-sm font-bold text-stone-900 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriber List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-stone-50/50">
          <h3 className="font-semibold text-stone-900">Список подписчиков</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Поиск по email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-56"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-sm hover:bg-black transition-colors"
            >
              Найти
            </button>
          </div>
        </div>

        {subscribers.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-stone-200" />
            <p>Подписчиков пока нет</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
              {subscribers.map((sub) => (
                <div key={sub.id} className="px-6 py-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-900 text-sm">{sub.email}</span>
                    <div className="flex items-center gap-2">
                      {sub.digestEnabled && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-medium rounded-full border border-purple-100">
                          Дайджест
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                        sub.status === "active"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-stone-100 text-stone-500 border-stone-200"
                      }`}>
                        {sub.status === "active" ? "Активен" : sub.status}
                      </span>
                    </div>
                  </div>
                  {sub.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sub.categories.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 bg-primary/5 text-primary text-xs rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-stone-400 mt-1 block">
                    {format(new Date(sub.createdAt), "d MMM yyyy", { locale: ru })}
                  </span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-stone-100 flex justify-between items-center bg-stone-50/50">
                <button
                  onClick={() => fetchData(page - 1, search)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-stone-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Назад
                </button>
                <span className="text-sm text-stone-500">{page} / {totalPages}</span>
                <button
                  onClick={() => fetchData(page + 1, search)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-stone-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Вперед
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { Bell } from "lucide-react";
