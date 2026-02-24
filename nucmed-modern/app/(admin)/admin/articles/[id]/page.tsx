"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

import remarkGfm from "remark-gfm";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  loading: () => <div className="animate-pulse bg-stone-200 h-40 rounded-xl" />,
  ssr: false,
});
import {
  ArrowLeft,
  Save,
  Send,
  Calendar,
  Trash2,
  ExternalLink,
  RefreshCw,
  Play,
  Eye,
  Edit3,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  Wand2,
  Upload,
  Check,
  AlertCircle,
  CalendarClock
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Article {
  id: string;
  slug?: string;
  titleOriginal: string;
  contentOriginal: string;
  excerptOriginal?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags: string[];
  status: string;
  significanceScore?: number;
  coverImageUrl?: string;
  externalUrl: string;
  scheduledAt?: string;
  publishedAt?: string;
  originalPublishedAt?: string;
  createdAt: string;
  aiModel?: string;
  processingError?: string;
  source?: { name: string; slug: string };
  images?: { id: string; originalUrl: string; storedUrl?: string; caption?: string; isCover: boolean }[];
}

import { CATEGORIES } from "@/lib/schemas/article";
import { ANIMAL_CATEGORIES, NOSOLOGIES, SPECIAL_SECTIONS } from "@/lib/config/constants";

// Custom markdown components for professional styling
const MarkdownComponents = {
  h1: ({ ...props }) => <h1 className="text-3xl font-bold text-stone-900 mt-8 mb-4" {...props} />,
  h2: ({ ...props }) => <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4 border-b border-stone-200 pb-2" {...props} />,
  h3: ({ ...props }) => <h3 className="text-xl font-bold text-stone-900 mt-6 mb-3" {...props} />,
  h4: ({ ...props }) => <h4 className="text-lg font-bold text-stone-900 mt-4 mb-2" {...props} />,
  p: ({ ...props }) => <p className="mb-4 leading-relaxed text-stone-700" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-stone-700" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-stone-700" {...props} />,
  li: ({ ...props }) => <li className="pl-1" {...props} />,
  blockquote: ({ ...props }) => <blockquote className="border-l-4 border-emerald-500 pl-4 py-1 my-4 text-stone-600 italic bg-stone-50 rounded-r-lg" {...props} />,
  a: ({ ...props }) => <a className="text-emerald-600 font-medium hover:underline transition-colors" {...props} />,
  code: ({ ...props }) => <code className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded text-sm font-mono border border-stone-200" {...props} />,
  pre: ({ ...props }) => <pre className="bg-stone-900 text-stone-50 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono" {...props} />,
};

export default function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [overrideOriginalDate, setOverrideOriginalDate] = useState(false);

  // Cover image state (local preview before save)
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  // Track if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!article) return false;
    const savedCover = article.coverImageUrl || "";
    const currentCover = pendingCoverUrl !== null ? pendingCoverUrl : savedCover;

    const scheduledChanged = article.status === "DRAFT"
      ? false // не считаем изменение даты черновика как несохранённое
      : scheduledAt !== (article.scheduledAt ? article.scheduledAt.slice(0, 16) : "");

    return (
      title !== (article.title || "") ||
      excerpt !== (article.excerpt || "") ||
      content !== (article.content || "") ||
      category !== (article.category || "") ||
      JSON.stringify(tags) !== JSON.stringify(article.tags || []) ||
      scheduledChanged ||
      currentCover !== savedCover
    );
  }, [article, title, excerpt, content, category, tags, scheduledAt, pendingCoverUrl]);

  // Cover has pending changes specifically
  const hasPendingCover = pendingCoverUrl !== null;

  useEffect(() => {
    // Check cache first
    const cached = sessionStorage.getItem(`article_${id}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setArticle(data);
        setTitle(data.title || "");
        setExcerpt(data.excerpt || "");
        setContent(data.content || "");
        setCategory(data.category || "");
        setTags(data.tags || []);
        setScheduledAt(data.scheduledAt ? data.scheduledAt.slice(0, 16) : "");
        setIsLoading(false);
      } catch {
        // Ignore cache errors
      }
    }
    loadArticle();
  }, [id]);

  async function loadArticle() {
    if (!article) setIsLoading(true);
    try {
      const response = await fetch(`/api/articles/${id}`);
      if (!response.ok) throw new Error("Article not found");

      const data = await response.json();
      setArticle(data);

      // Cache for instant navigation
      try {
        sessionStorage.setItem(`article_${id}`, JSON.stringify(data));
      } catch {
        // Ignore storage errors
      }

      // Populate form
      setTitle(data.title || "");
      setExcerpt(data.excerpt || "");
      setContent(data.content || "");
      setCategory(data.category || "");
      setTags(data.tags || []);
      setScheduledAt(data.scheduledAt ? data.scheduledAt.slice(0, 16) : "");
      // Heuristic: if original date matches published, assume override was intended
      if (data.originalPublishedAt && data.publishedAt && data.originalPublishedAt === data.publishedAt) {
        setOverrideOriginalDate(true);
      }
    } catch (err) {
      setError("Не удалось загрузить статью");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          category,
          tags,
          scheduledAt: scheduledAt || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Save failed");
      }

      const updated = await response.json();
      setArticle(updated);

      // Sync form fields with server response to clear "unsaved changes"
      setTitle(updated.title || "");
      setExcerpt(updated.excerpt || "");
      setContent(updated.content || "");
      setCategory(updated.category || "");
      setTags(updated.tags || []);
      setScheduledAt(updated.scheduledAt ? updated.scheduledAt.slice(0, 16) : "");

      // Update cache
      try {
        sessionStorage.setItem(`article_${id}`, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }

      setSuccessMessage("Изменения сохранены");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProcess() {
    setIsProcessing(true);
    setError("");
    try {
      const response = await fetch(`/api/articles/${id}/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Processing failed");
      }

      await loadArticle();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePublish() {
    setIsSaving(true);
    try {
      const now = new Date();
      const response = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          ...(overrideOriginalDate && { originalPublishedAt: now.toISOString(), publishedAt: now.toISOString() })
        }),
      });

      if (response.ok) {
        toast.success("Статья успешно опубликована!", {
          description: title || article?.titleOriginal,
        });
        router.push("/admin/queue?status=PUBLISHED");
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error("Publish failed with status:", response.status, errData);
        toast.error(`Не удалось опубликовать статью: ${errData.error || response.statusText}`);
      }
    } catch (err) {
      console.error("Publish exception:", err);
      toast.error("Ошибка при публикации (см. консоль)");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) {
      toast.error("Выберите дату публикации");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SCHEDULED",
          scheduledAt: new Date(scheduledAt).toISOString(),
          ...(overrideOriginalDate && { originalPublishedAt: new Date(scheduledAt).toISOString() })
        }),
      });

      if (response.ok) {
        toast.success("Статья запланирована!", {
          description: `Публикация: ${new Date(scheduledAt).toLocaleString("ru")}`,
        });
        router.push("/admin/calendar");
      } else {
        toast.error("Не удалось запланировать статью");
      }
    } catch {
      toast.error("Ошибка при планировании");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateScheduledDate() {
    if (!scheduledAt) {
      toast.error("Выберите новую дату публикации");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(scheduledAt).toISOString(),
          ...(overrideOriginalDate && { originalPublishedAt: new Date(scheduledAt).toISOString() })
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setArticle(updated);
        toast.success("Дата публикации обновлена!", {
          description: `Новая дата: ${new Date(scheduledAt).toLocaleString("ru")}`,
        });
      } else {
        toast.error("Не удалось обновить дату");
      }
    } catch {
      toast.error("Ошибка при обновлении даты");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/queue");
      }
    } catch (err) {
      setError("Не удалось удалить статью");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateCover() {
    console.log("[handleGenerateCover] Starting...", { title, articleTitleOriginal: article?.titleOriginal });
    
    if (!title && !article?.titleOriginal) {
      setError("Статья должна иметь заголовок для генерации обложки");
      console.log("[handleGenerateCover] Error: no title");
      return;
    }

    setIsGeneratingCover(true);
    setError("");

    try {
      console.log(`[handleGenerateCover] Fetching /api/articles/${id}/generate-cover...`);
      const response = await fetch(`/api/articles/${id}/generate-cover`, {
        method: "POST",
      });
      
      console.log("[handleGenerateCover] Response:", response.status, response.statusText);

      if (!response.ok) {
        const err = await response.json();
        console.error("[handleGenerateCover] Error response:", err);
        throw new Error(err.error || err.details || "Ошибка генерации обложки");
      }

      const data = await response.json();
      console.log("[handleGenerateCover] Success - data.article:", data.article);
      console.log("[handleGenerateCover] coverImageUrl:", data.coverImageUrl);
      
      // AI-generated cover is already saved by the endpoint
      // Just update the article state, no pending state needed
      // Add cache-buster to force browser to reload the image (same URL = cached)
      const cacheBuster = `?t=${Date.now()}`;
      let updatedArticle: Article | null = null;
      if (data.article) {
        if (data.article.coverImageUrl) {
          data.article.coverImageUrl = data.article.coverImageUrl.split('?')[0] + cacheBuster;
        }
        updatedArticle = data.article;
      } else if (data.coverImageUrl) {
        const url = data.coverImageUrl.split('?')[0] + cacheBuster;
        updatedArticle = article ? { ...article, coverImageUrl: url } : null;
      }
      
      if (updatedArticle) {
        setArticle(updatedArticle);
        // Update sessionStorage cache so page reload shows the new cover
        try {
          sessionStorage.setItem(`article_${id}`, JSON.stringify(updatedArticle));
        } catch { /* ignore */ }
      }
      setPendingCoverUrl(null);
      setPendingCoverFile(null);
      setSuccessMessage("Обложка сгенерирована и сохранена");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      console.error("[handleGenerateCover] Catch error:", err);
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(message);
    } finally {
      setIsGeneratingCover(false);
      console.log("[handleGenerateCover] Finished");
    }
  }

  function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Неподдерживаемый формат. Разрешены: JPEG, PNG, WebP, GIF");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл слишком большой. Максимум 10МБ");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPendingCoverUrl(previewUrl);
    setPendingCoverFile(file);
    setError("");
  }

  async function handleSaveCover() {
    if (!pendingCoverFile && !pendingCoverUrl) return;

    setIsUploadingCover(true);
    setError("");

    try {
      if (pendingCoverFile) {
        // Upload custom file
        const formData = new FormData();
        formData.append("file", pendingCoverFile);

        const response = await fetch(`/api/articles/${id}/upload-cover`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Ошибка загрузки");
        }

        const data = await response.json();
        setArticle(data.article);
      }
      // If pendingCoverUrl is from AI generation, it's already saved

      // Clear pending state
      setPendingCoverUrl(null);
      setPendingCoverFile(null);
      setSuccessMessage("Обложка сохранена");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(message);
    } finally {
      setIsUploadingCover(false);
    }
  }

  function handleDiscardCover() {
    // Clean up blob URL if exists
    if (pendingCoverUrl && pendingCoverUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingCoverUrl);
    }
    setPendingCoverUrl(null);
    setPendingCoverFile(null);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12 text-muted-foreground">Статья не найдена</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/queue">
          <button className="p-2.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0 overflow-hidden">
          <h1 className="text-2xl font-semibold text-stone-900 truncate pr-4" title={article.title || article.titleOriginal}>
            {article.title || article.titleOriginal}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge status={article.status} />
            {article.source && (
              <span className="text-sm text-stone-500">{article.source.name}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
            showPreview
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          )}
        >
          {showPreview ? (
            <><Edit3 className="h-4 w-4" /> Редактор</>
          ) : (
            <><Eye className="h-4 w-4" /> Превью</>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {hasUnsavedChanges() && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Есть несохраненные изменения</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <><RefreshCw className="h-3 w-3 animate-spin" /> Сохранение...</>
            ) : (
              <><Save className="h-3 w-3" /> Сохранить</>
            )}
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Content */}
          <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900">Оригинал (EN)</h3>
              <a
                href={article.externalUrl}
                target="_blank"
                rel="noopener"
                className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="px-6 py-4">
              <p className="font-medium text-stone-900 mb-2">{article.titleOriginal}</p>
              <p className="text-sm text-stone-500 line-clamp-4">
                {article.excerptOriginal || article.contentOriginal.slice(0, 300)}...
              </p>
            </div>
          </div>

          {/* Processing Error */}
          {article.processingError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700">
                <strong>Ошибка обработки:</strong> {article.processingError}
              </p>
            </div>
          )}

          {/* Processed Content Editor / Preview */}
          {showPreview ? (
            <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-stone-900">Предпросмотр</h3>
              </div>
              <div className="px-6 py-6">
                <article>
                  {category && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full mb-4">
                      {category}
                    </span>
                  )}
                  <h1 className="text-3xl font-bold text-stone-900 mb-4 leading-tight">
                    {title || article.titleOriginal}
                  </h1>
                  {excerpt && (
                    <p className="text-lg text-stone-600 mb-8 leading-relaxed border-l-4 border-emerald-500 pl-4">
                      {excerpt}
                    </p>
                  )}
                  <div className="max-w-none text-stone-900">
                    <ReactMarkdown
                      components={MarkdownComponents}
                      remarkPlugins={[remarkGfm]}
                    >
                      {content || "*Текст статьи пуст*"}
                    </ReactMarkdown>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-stone-200 flex gap-2 flex-wrap">
                      {tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 text-sm font-medium text-stone-600 bg-stone-100 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-stone-900">Контент (RU)</h3>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Заголовок</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Заголовок статьи на русском"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Лид (краткое описание)</label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="2-3 предложения о сути статьи"
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Текст статьи (Markdown)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Полный текст статьи в формате Markdown"
                    rows={16}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 resize-y font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900">Действия</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              {(article.status === "INGESTED" || article.status === "FAILED") && (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-70"
                >
                  {isProcessing ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Обработка...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Обработать AI</>
                  )}
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>

              {article.status === "DRAFT" && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const isFuture = scheduledAt && new Date(scheduledAt) > new Date();
                      if (isFuture) {
                        handleSchedule();
                      } else {
                        setPublishDialogOpen(true);
                      }
                    }}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {scheduledAt && new Date(scheduledAt) > new Date() ? "Запланировать" : "Опубликовать"}
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      onClick={handleSchedule}
                      disabled={!scheduledAt || isSaving}
                      className="px-3 py-2.5 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all disabled:opacity-50"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>

                  <label className="flex items-start gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      checked={overrideOriginalDate}
                      onChange={(e) => setOverrideOriginalDate(e.target.checked)}
                    />
                    <div className="space-y-1">
                      <div className="font-medium">Перезаписать дату оригинала датой публикации на сайте</div>
                      <div className="text-xs text-stone-500">
                        Если включено, для сортировки и отображения будет использована дата на сайте (текущая или запланированная), а оригинальная дата игнорируется.
                      </div>
                    </div>
                  </label>

                </>
              )}

              {article.status === "SCHEDULED" && (
                <div className="space-y-3">
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="flex items-center gap-2 text-violet-700 mb-2">
                      <CalendarClock className="h-4 w-4" />
                      <span className="text-sm font-medium">Запланирована публикация</span>
                    </div>
                    <p className="text-sm text-violet-600">
                      {article.scheduledAt ? new Date(article.scheduledAt).toLocaleString("ru") : "Дата не установлена"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                    <button
                      onClick={handleUpdateScheduledDate}
                      disabled={!scheduledAt || isSaving}
                      className="px-3 py-2.5 bg-violet-100 text-violet-700 rounded-xl hover:bg-violet-200 transition-all disabled:opacity-50"
                      title="Изменить дату"
                    >
                      <CalendarClock className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setPublishDialogOpen(true);
                    }}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    Опубликовать сейчас
                  </button>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteDialogOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900">Метаданные</h3>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="">Выберите категорию</option>
                  <optgroup label="По виду животного">
                    {ANIMAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Нозологии">
                    {NOSOLOGIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Специальные разделы">
                    {SPECIAL_SECTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">Теги</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Добавить тег"
                    className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className="px-3 py-1.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg cursor-pointer hover:bg-red-100 hover:text-red-600 transition-all"
                    >
                      {tag} ×
                    </span>
                  ))}
                </div>
              </div>

              {article.significanceScore && (
                <div className="pt-4 border-t border-stone-100">
                  <label className="text-sm font-medium text-stone-700 mb-2 block flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Значимость
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-emerald-600">{article.significanceScore}</div>
                    <div className="text-stone-400 text-lg">/10</div>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                        style={{ width: `${(article.significanceScore || 0) * 10}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    {article.significanceScore >= 8 ? "Высокая значимость" :
                      article.significanceScore >= 5 ? "Средняя значимость" : "Низкая значимость"}
                  </p>
                </div>
              )}

              {article.aiModel && (
                <div className="pt-4 border-t border-stone-100">
                  <label className="text-sm font-medium text-stone-700 mb-1 block">AI модель</label>
                  <p className="text-sm text-stone-500">{article.aiModel}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cover Image */}
          <div className={cn(
            "bg-white rounded-2xl border overflow-hidden transition-all",
            hasPendingCover ? "border-amber-300 ring-2 ring-amber-100" : "border-stone-200/60"
          )}>
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-stone-400" />
                <h3 className="font-semibold text-stone-900">Обложка</h3>
                {hasPendingCover && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    Не сохранено
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCoverFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover || isGeneratingCover}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-all disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" /> Загрузить
                </button>
                <button
                  onClick={() => {
                    console.log("[UI] AI button clicked", { isGeneratingCover, isUploadingCover, title, articleTitleOriginal: article?.titleOriginal });
                    handleGenerateCover();
                  }}
                  disabled={isGeneratingCover || isUploadingCover}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isGeneratingCover ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" /> Генерация...</>
                  ) : (
                    <><Wand2 className="h-3 w-3" /> AI</>
                  )}
                </button>
              </div>
            </div>
            <div className="px-6 py-5">
              {/* Show pending cover or saved cover */}
              {(pendingCoverUrl || article.coverImageUrl) ? (
                <div className="space-y-3">
                  <div className="relative aspect-video bg-stone-100 rounded-xl overflow-hidden group">
                    <CoverImage
                      article={article}
                      pendingCoverUrl={pendingCoverUrl}
                      hasPendingCover={hasPendingCover}
                    />
                  </div>

                  {/* Pending cover actions */}
                  {hasPendingCover && pendingCoverFile && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-2 text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        <span>Новая обложка не сохранена</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDiscardCover}
                          className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-all"
                        >
                          Отменить
                        </button>
                        <button
                          onClick={handleSaveCover}
                          disabled={isUploadingCover}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                          {isUploadingCover ? (
                            <><RefreshCw className="h-3 w-3 animate-spin" /> Сохранение...</>
                          ) : (
                            <><Check className="h-3 w-3" /> Сохранить</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {!hasPendingCover && article.coverImageUrl && (
                    <p className="text-xs text-stone-500 truncate" title={article.coverImageUrl}>
                      {article.coverImageUrl.slice(0, 50)}...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 bg-stone-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-stone-400" />
                  </div>
                  <p className="text-sm text-stone-500 mb-4">Обложка не установлена</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover || isGeneratingCover}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" /> Загрузить
                    </button>
                    <button
                      onClick={() => {
                        console.log("[UI] AI обложка button clicked", { isGeneratingCover, title, articleTitleOriginal: article?.titleOriginal });
                        handleGenerateCover();
                      }}
                      disabled={isGeneratingCover}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50"
                    >
                      {isGeneratingCover ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Генерация...</>
                      ) : (
                        <><Wand2 className="h-4 w-4" /> AI обложка</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Images */}
          {article.images && article.images.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-stone-400" />
                <h3 className="font-semibold text-stone-900">Изображения</h3>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-3">
                  {article.images.map((img) => (
                    <div key={img.id} className="relative aspect-video bg-stone-100 rounded-xl overflow-hidden group">
                      <img
                        src={img.storedUrl || img.originalUrl}
                        alt={img.caption || ""}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      {img.isCover && (
                        <span className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-lg">
                          Обложка
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Опубликовать статью?</AlertDialogTitle>
            <AlertDialogDescription>
              Статья будет доступна всем пользователям на сайте.
              {overrideOriginalDate && " Дата публикации оригинала будет обновлена."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20"
            >
              Опубликовать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить статью "{article.title || article.titleOriginal}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    INGESTED: { label: "Новая", className: "bg-stone-100 text-stone-700" },
    PROCESSING: { label: "Обработка", className: "bg-blue-100 text-blue-700" },
    DRAFT: { label: "Черновик", className: "bg-amber-100 text-amber-700" },
    SCHEDULED: { label: "Запланирована", className: "bg-violet-100 text-violet-700" },
    PUBLISHED: { label: "Опубликована", className: "bg-emerald-100 text-emerald-700" },
    FAILED: { label: "Ошибка", className: "bg-red-100 text-red-700" },
    ARCHIVED: { label: "Архив", className: "bg-stone-100 text-stone-500" },
  };

  const { label, className } = config[status] || { label: status, className: "bg-stone-100" };

  return (
    <span className={cn("px-3 py-1 text-xs font-semibold rounded-full", className)}>
      {label}
    </span>
  );
}

interface CoverImageProps {
  article: Article;
  pendingCoverUrl: string | null;
  hasPendingCover: boolean;
}

function CoverImage({ article, pendingCoverUrl, hasPendingCover }: CoverImageProps) {
  // Use pending cover if available
  if (pendingCoverUrl) {
    return (
      <>
        <img
          src={pendingCoverUrl}
          alt="Обложка статьи"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {hasPendingCover && (
          <div className="absolute inset-0 bg-amber-500/10 border-2 border-amber-400 rounded-xl pointer-events-none" />
        )}
      </>
    );
  }

  // Find stored cover from images (not data: URL)
  const coverImage = article.images?.find(img => img.isCover);
  const imageUrl = coverImage?.storedUrl || coverImage?.originalUrl;

  // If we have a stored image URL, use it
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Обложка статьи"
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={(e) => {
          const img = e.currentTarget;
          const retries = parseInt(img.dataset.retries || "0");
          if (retries < 3) {
            img.dataset.retries = String(retries + 1);
            const baseUrl = img.src.split('?')[0];
            setTimeout(() => {
              img.src = `${baseUrl}?t=${Date.now()}`;
            }, 1500 * (retries + 1));
          }
        }}
      />
    );
  }

  // If coverImageUrl is a data: URL, show placeholder
  if (article.coverImageUrl?.startsWith('data:')) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-500">
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <span className="text-sm">Обложка сохранена</span>
        <span className="text-xs mt-1 opacity-70">(AI-generated)</span>
      </div>
    );
  }

  // Fallback to coverImageUrl if it's a normal URL
  return (
    <img
      src={article.coverImageUrl}
      alt="Обложка статьи"
      className="w-full h-full object-cover transition-transform group-hover:scale-105"
      onError={(e) => {
        const img = e.currentTarget;
        const retries = parseInt(img.dataset.retries || "0");
        if (retries < 3) {
          img.dataset.retries = String(retries + 1);
          const baseUrl = img.src.split('?')[0];
          setTimeout(() => {
            img.src = `${baseUrl}?t=${Date.now()}`;
          }, 1500 * (retries + 1));
        }
      }}
    />
  );
}
