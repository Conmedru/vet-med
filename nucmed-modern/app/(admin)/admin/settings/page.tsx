"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Users, 
  Globe, 
  Bot, 
  Bell,
  Save,
  Plus,
  Trash2,
  Edit2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Eye,
  X,
  Check
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface SiteSettings {
  site_name: string;
  site_description: string;
  articles_per_page: number;
  auto_publish: boolean;
  require_review: boolean;
  scrape_interval_hours: number;
  ai_processing_enabled: boolean;
  ai_model: string;
  email_notifications: boolean;
  telegram_notifications: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  SUPER_ADMIN: { label: "Супер-админ", icon: ShieldCheck, color: "text-red-600 bg-red-50" },
  ADMIN: { label: "Админ", icon: Shield, color: "text-orange-600 bg-orange-50" },
  EDITOR: { label: "Редактор", icon: Edit2, color: "text-blue-600 bg-blue-50" },
  MODERATOR: { label: "Модератор", icon: Eye, color: "text-purple-600 bg-purple-50" },
  VIEWER: { label: "Читатель", icon: User, color: "text-stone-600 bg-stone-100" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Активен", color: "text-emerald-600 bg-emerald-50" },
  INACTIVE: { label: "Неактивен", color: "text-stone-500 bg-stone-100" },
  SUSPENDED: { label: "Заблокирован", color: "text-red-600 bg-red-50" },
  PENDING_VERIFICATION: { label: "Ожидает", color: "text-amber-600 bg-amber-50" },
};

type TabType = "users" | "site" | "ai" | "notifications";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "EDITOR" });
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/settings"),
      ]);
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      
      if (res.ok) {
        setShowAddUser(false);
        setNewUser({ email: "", password: "", name: "", role: "EDITOR" });
        fetchData();
        showMessage("success", "Пользователь добавлен");
      } else {
        const error = await res.json();
        showMessage("error", error.error || "Ошибка создания пользователя");
      }
    } catch {
      showMessage("error", "Ошибка соединения");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUser(id: string, data: Partial<AdminUser>) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        setEditingUser(null);
        fetchData();
        showMessage("success", "Пользователь обновлен");
      } else {
        showMessage("error", "Ошибка обновления");
      }
    } catch {
      showMessage("error", "Ошибка соединения");
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Удалить этого пользователя?")) return;
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      
      if (res.ok) {
        fetchData();
        showMessage("success", "Пользователь удален");
      } else {
        const error = await res.json();
        showMessage("error", error.error || "Ошибка удаления");
      }
    } catch {
      showMessage("error", "Ошибка соединения");
    }
  }

  async function handleSaveSettings() {
    if (!settings) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      
      if (res.ok) {
        showMessage("success", "Настройки сохранены");
      } else {
        showMessage("error", "Ошибка сохранения");
      }
    } catch {
      showMessage("error", "Ошибка соединения");
    } finally {
      setSaving(false);
    }
  }

  function showMessage(type: "success" | "error", text: string) {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  }

  function updateSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  }

  const tabs = [
    { id: "users" as const, label: "Пользователи", icon: Users },
    { id: "site" as const, label: "Сайт", icon: Globe },
    { id: "ai" as const, label: "AI обработка", icon: Bot },
    { id: "notifications" as const, label: "Уведомления", icon: Bell },
  ];

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Настройки</h1>
          <p className="text-stone-500 mt-1">Управление пользователями и конфигурацией</p>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mb-6 p-4 rounded-xl border ${
          saveMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <div className="flex items-center gap-2">
            {saveMessage.type === "success" ? <Check className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            <span className="font-medium">{saveMessage.text}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Add User Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Добавить пользователя
                </button>
              </div>

              {/* Add User Form */}
              {showAddUser && (
                <div className="bg-white rounded-2xl border border-stone-200/60 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-stone-900">Новый пользователь</h3>
                    <button onClick={() => setShowAddUser(false)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Пароль *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Имя</label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Роль</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {Object.entries(ROLE_CONFIG).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUser(false)}
                        className="px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
                      >
                        {saving ? "Создание..." : "Создать"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List */}
              <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100">
                  <h2 className="font-semibold text-stone-900">Пользователи системы</h2>
                </div>
                
                {users.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500 font-medium">Пользователи не найдены</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {users.map((user) => {
                      const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.VIEWER;
                      const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.INACTIVE;
                      const RoleIcon = roleConfig.icon;
                      
                      return (
                        <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleConfig.color}`}>
                              <RoleIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-stone-900">{user.name || user.email}</p>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              <p className="text-sm text-stone-500">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-medium rounded-lg ${roleConfig.color}`}>
                              {roleConfig.label}
                            </span>
                            
                            {editingUser?.id === user.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={editingUser.role}
                                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                  className="text-sm border border-stone-200 rounded-lg px-2 py-1"
                                >
                                  {Object.entries(ROLE_CONFIG).map(([key, { label }]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleUpdateUser(user.id, { role: editingUser.role })}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingUser(user)}
                                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Site Settings Tab */}
          {activeTab === "site" && settings && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200/60 p-6">
                <h3 className="text-lg font-semibold text-stone-900 mb-6">Общие настройки</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Название сайта</label>
                    <input
                      type="text"
                      value={settings.site_name}
                      onChange={(e) => updateSetting("site_name", e.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Описание</label>
                    <input
                      type="text"
                      value={settings.site_description}
                      onChange={(e) => updateSetting("site_description", e.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Статей на странице</label>
                    <input
                      type="number"
                      value={settings.articles_per_page}
                      onChange={(e) => updateSetting("articles_per_page", parseInt(e.target.value) || 10)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Интервал скрапинга (часы)</label>
                    <input
                      type="number"
                      value={settings.scrape_interval_hours}
                      onChange={(e) => updateSetting("scrape_interval_hours", parseInt(e.target.value) || 6)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_publish}
                      onChange={(e) => updateSetting("auto_publish", e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-900">Автопубликация</span>
                      <p className="text-xs text-stone-500">Автоматически публиковать статьи после обработки AI</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.require_review}
                      onChange={(e) => updateSetting("require_review", e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-900">Требовать модерацию</span>
                      <p className="text-xs text-stone-500">Все статьи проходят проверку перед публикацией</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}

          {/* AI Settings Tab */}
          {activeTab === "ai" && settings && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200/60 p-6">
                <h3 className="text-lg font-semibold text-stone-900 mb-6">AI обработка</h3>
                
                <div className="space-y-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ai_processing_enabled}
                      onChange={(e) => updateSetting("ai_processing_enabled", e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-900">Включить AI обработку</span>
                      <p className="text-xs text-stone-500">Автоматически обрабатывать новые статьи через GPT</p>
                    </div>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Модель</label>
                    <select
                      value={settings.ai_model}
                      onChange={(e) => updateSetting("ai_model", e.target.value)}
                      className="w-full max-w-md px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="claude-3-sonnet">Claude 3.5 Sonnet (рекомендуется)</option>
                      <option value="claude-3-haiku">Claude 3 Haiku (быстро)</option>
                      <option value="claude-3-opus">Claude 3 Opus (максимум качества)</option>
                      <option value="llama-3-70b">Llama 3 70B (Replicate, дешево)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-6">
                <h4 className="font-medium text-stone-900 mb-3">О моделях</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-stone-200/60">
                    <p className="font-medium text-stone-900 text-sm">Claude 3.5 Sonnet</p>
                    <p className="text-xs text-stone-500 mt-1">$3/1M токенов. Отличное качество перевода, рекомендуется.</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-stone-200/60">
                    <p className="font-medium text-stone-900 text-sm">Claude 3 Haiku</p>
                    <p className="text-xs text-stone-500 mt-1">$0.25/1M токенов. Быстрый, экономичный вариант.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && settings && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200/60 p-6">
                <h3 className="text-lg font-semibold text-stone-900 mb-6">Уведомления</h3>
                
                <div className="space-y-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={(e) => updateSetting("email_notifications", e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-900">Email уведомления</span>
                      <p className="text-xs text-stone-500">Получать уведомления о новых статьях на почту</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200/60 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.telegram_notifications}
                      onChange={(e) => updateSetting("telegram_notifications", e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-lg font-semibold text-stone-900">Telegram уведомления</span>
                  </label>
                </div>
                
                {settings.telegram_notifications && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Bot Token</label>
                      <input
                        type="password"
                        value={settings.telegram_bot_token}
                        onChange={(e) => updateSetting("telegram_bot_token", e.target.value)}
                        placeholder="123456:ABC-DEF..."
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Chat ID</label>
                      <input
                        type="text"
                        value={settings.telegram_chat_id}
                        onChange={(e) => updateSetting("telegram_chat_id", e.target.value)}
                        placeholder="-1001234567890"
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
