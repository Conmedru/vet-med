"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
  ToggleLeft,
  ToggleRight,
  Upload,
  X,
  ArrowLeft,
  Calendar,
  Megaphone,
  ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CATEGORIES } from "@/lib/config/constants";

interface SponsoredPost {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  targetUrl: string;
  advertiserName: string | null;
  advertiserLogo: string | null;
  category: string | null;
  priority: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "list" | "create" | "edit";

export default function SponsoredPage() {
  const [posts, setPosts] = useState<SponsoredPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingPost, setEditingPost] = useState<SponsoredPost | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sponsored");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to load sponsored posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleToggleActive = async (post: SponsoredPost) => {
    try {
      const res = await fetch(`/api/admin/sponsored/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !post.isActive }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isActive: !p.isActive } : p))
        );
      }
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить рекламную публикацию?")) return;
    try {
      const res = await fetch(`/api/admin/sponsored/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSaved = () => {
    setViewMode("list");
    setEditingPost(null);
    fetchPosts();
  };

  const handleEdit = (post: SponsoredPost) => {
    setEditingPost(post);
    setViewMode("edit");
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-amber-600" />
            </div>
            Рекламные публикации
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            Нативные рекламные посты, отображаемые в ленте среди обычных статей
          </p>
        </div>
        {viewMode === "list" ? (
          <button
            onClick={() => {
              setEditingPost(null);
              setViewMode("create");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать
          </button>
        ) : (
          <button
            onClick={() => {
              setViewMode("list");
              setEditingPost(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к списку
          </button>
        )}
      </div>

      {viewMode === "list" && (
        <PostsList
          posts={posts}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}

      {(viewMode === "create" || viewMode === "edit") && (
        <PostForm
          post={editingPost}
          onSaved={handleSaved}
          onCancel={() => {
            setViewMode("list");
            setEditingPost(null);
          }}
        />
      )}
    </div>
  );
}

// --- Posts List ---

function PostsList({
  posts,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  posts: SponsoredPost[];
  loading: boolean;
  onEdit: (p: SponsoredPost) => void;
  onDelete: (id: string) => void;
  onToggleActive: (p: SponsoredPost) => void;
}) {
  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Нет рекламных публикаций</h2>
        <p className="text-stone-500 max-w-md mx-auto">
          Создайте первую рекламную публикацию, которая будет нативно отображаться в ленте новостей.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Всего" value={posts.length} />
        <StatCard label="Активных" value={posts.filter((p) => p.isActive).length} color="emerald" />
        <StatCard
          label="Показов"
          value={posts.reduce((sum, p) => sum + p.impressions, 0)}
          icon={Eye}
        />
        <StatCard
          label="Кликов"
          value={posts.reduce((sum, p) => sum + p.clicks, 0)}
          icon={MousePointerClick}
        />
      </div>

      {/* Posts table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="divide-y divide-stone-100">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-5 hover:bg-stone-50/50 transition-colors group"
            >
              <div className="flex items-start gap-4">
                {/* Cover thumbnail */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-stone-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-stone-900 truncate">{post.title}</h3>
                    {post.category && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full flex-shrink-0">
                        {post.category}
                      </span>
                    )}
                  </div>

                  {post.description && (
                    <p className="text-sm text-stone-500 line-clamp-1 mb-2">{post.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-stone-400">
                    <a
                      href={post.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[200px]"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {post.targetUrl.replace(/^https?:\/\//, "").slice(0, 40)}
                    </a>
                    {post.advertiserName && (
                      <span className="flex-shrink-0">{post.advertiserName}</span>
                    )}
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(post.startDate), "d MMM yyyy", { locale: ru })}
                      {post.endDate &&
                        ` — ${format(new Date(post.endDate), "d MMM yyyy", { locale: ru })}`}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm flex-shrink-0">
                  <div className="text-center">
                    <div className="font-bold text-stone-900 tabular-nums">
                      {post.impressions.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase">Показы</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-stone-900 tabular-nums">
                      {post.clicks.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase">Клики</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-stone-900 tabular-nums">
                      {post.impressions > 0
                        ? ((post.clicks / post.impressions) * 100).toFixed(1) + "%"
                        : "—"}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase">CTR</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onToggleActive(post)}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                    title={post.isActive ? "Деактивировать" : "Активировать"}
                  >
                    {post.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-stone-400" />
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(post)}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                    title="Редактировать"
                  >
                    <Pencil className="w-4 h-4 text-stone-500" />
                  </button>
                  <button
                    onClick={() => onDelete(post.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4 text-stone-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Stat Card ---

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-stone-500 text-sm font-medium">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-stone-400" />}
      </div>
      <span
        className={`text-2xl font-bold ${
          color === "emerald" ? "text-emerald-600" : "text-stone-900"
        }`}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// --- Post Form (Create / Edit) ---

function PostForm({
  post,
  onSaved,
  onCancel,
}: {
  post: SponsoredPost | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEditing = !!post;

  const [title, setTitle] = useState(post?.title || "");
  const [description, setDescription] = useState(post?.description || "");
  const [targetUrl, setTargetUrl] = useState(post?.targetUrl || "");
  const [advertiserName, setAdvertiserName] = useState(post?.advertiserName || "");
  const [category, setCategory] = useState(post?.category || "");
  const [priority, setPriority] = useState(post?.priority ?? 0);
  const [isActive, setIsActive] = useState(post?.isActive ?? true);
  const [startDate, setStartDate] = useState(
    post?.startDate ? format(new Date(post.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    post?.endDate ? format(new Date(post.endDate), "yyyy-MM-dd") : ""
  );

  const [coverPreview, setCoverPreview] = useState<string | null>(post?.coverImageUrl || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Неподдерживаемый формат. Разрешены: JPEG, PNG, WebP, GIF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл слишком большой. Максимум 10МБ");
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetUrl.trim()) {
      setError("Заголовок и ссылка обязательны");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        targetUrl: targetUrl.trim(),
        advertiserName: advertiserName.trim() || null,
        category: category || null,
        priority,
        isActive,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
      };

      const url = isEditing ? `/api/admin/sponsored/${post.id}` : "/api/admin/sponsored";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      const savedId = data.post.id;

      // Upload cover if selected
      if (coverFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", coverFile);

        const uploadRes = await fetch(`/api/admin/sponsored/${savedId}/upload-cover`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error("Cover upload failed, but post was saved");
        }
        setUploading(false);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50">
          <h2 className="font-semibold text-stone-900">
            {isEditing ? "Редактирование публикации" : "Новая рекламная публикация"}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Заголовок <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок публикации"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание для карточки в ленте"
              rows={3}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {/* Target URL */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Целевая ссылка <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/landing-page"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Обложка
            </label>
            {coverPreview ? (
              <div className="relative w-full max-w-md">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full aspect-[16/10] object-cover rounded-xl border border-stone-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full max-w-md h-40 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <Upload className="w-8 h-8 text-stone-300 mb-2" />
                <span className="text-sm text-stone-500">Нажмите для загрузки</span>
                <span className="text-xs text-stone-400 mt-1">JPEG, PNG, WebP, GIF — до 10МБ</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Advertiser Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Рекламодатель
              </label>
              <input
                type="text"
                value={advertiserName}
                onChange={(e) => setAdvertiserName(e.target.value)}
                placeholder="Название компании"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Категория (таргетинг)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">Без таргетинга (все разделы)</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Приоритет (0-100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-stone-400 mt-1">Чем выше, тем раньше в ленте</p>
            </div>

            {/* Active toggle */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Статус
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors w-full ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 bg-stone-50 text-stone-500"
                }`}
              >
                {isActive ? (
                  <ToggleRight className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                {isActive ? "Активна" : "Неактивна"}
              </button>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Дата начала
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Дата окончания
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-stone-400 mt-1">Оставьте пустым для бессрочной</p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
        >
          {saving
            ? "Сохранение..."
            : uploading
            ? "Загрузка обложки..."
            : isEditing
            ? "Сохранить"
            : "Создать публикацию"}
        </button>
      </div>
    </form>
  );
}
