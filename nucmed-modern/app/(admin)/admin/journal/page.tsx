"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type ViewMode = "list" | "create" | "edit";

interface JournalIssue {
  id: string;
  slug: string;
  title: string;
  issueNumber: string | null;
  publicationDate: string;
  description: string | null;
  coverImageUrl: string;
  coverAlt: string | null;
  landingUrl: string | null;
  pdfUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  title: string;
  issueNumber: string;
  publicationDate: string;
  description: string;
  coverAlt: string;
  landingUrl: string;
  pdfUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  issueNumber: "",
  publicationDate: new Date().toISOString().slice(0, 10),
  description: "",
  coverAlt: "",
  landingUrl: "",
  pdfUrl: "",
  isPublished: false,
  isFeatured: true,
};

function mapIssueToForm(issue: JournalIssue): FormState {
  return {
    title: issue.title,
    issueNumber: issue.issueNumber || "",
    publicationDate: issue.publicationDate.slice(0, 10),
    description: issue.description || "",
    coverAlt: issue.coverAlt || "",
    landingUrl: issue.landingUrl || "",
    pdfUrl: issue.pdfUrl || "",
    isPublished: issue.isPublished,
    isFeatured: issue.isFeatured,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function AdminJournalPage() {
  const [issues, setIssues] = useState<JournalIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingIssue, setEditingIssue] = useState<JournalIssue | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [pdfDragOver, setPdfDragOver] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty && viewMode !== "list") {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, viewMode]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/journal");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch issues");
      setIssues(data.issues || []);
    } catch (fetchError) {
      console.error("[Admin Journal] fetch issues error:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Ошибка загрузки выпусков");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const canSave = useMemo(() => {
    return form.title.trim().length > 0 && form.publicationDate.trim().length > 0;
  }, [form.title, form.publicationDate]);

  const willHaveCover = useMemo(() => {
    if (coverFile) return true;
    if (editingIssue?.coverImageUrl) return true;
    return false;
  }, [coverFile, editingIssue?.coverImageUrl]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingIssue(null);
    setCoverPreview(null);
    setCoverFile(null);
    setPdfFile(null);
    setPdfFileName(null);
    setIsDirty(false);
    setViewMode("list");
    setError("");
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingIssue(null);
    setCoverPreview(null);
    setCoverFile(null);
    setPdfFile(null);
    setPdfFileName(null);
    setIsDirty(false);
    setViewMode("create");
    setError("");
    setSuccess("");
  }

  function openEdit(issue: JournalIssue) {
    setEditingIssue(issue);
    setForm(mapIssueToForm(issue));
    setCoverPreview(issue.coverImageUrl || null);
    setCoverFile(null);
    setPdfFile(null);
    setPdfFileName(issue.pdfUrl ? "PDF загружен" : null);
    setIsDirty(false);
    setViewMode("edit");
    setError("");
    setSuccess("");
  }

  function onFieldChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function onCoverSelected(file: File | null) {
    if (!file) return;

    if (file.type !== "image/jpeg") {
      setError("Для обложки журнала разрешён только JPEG");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Файл обложки слишком большой. Максимум 10 МБ");
      return;
    }

    setError("");
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setIsDirty(true);
  }

  function onPdfSelected(file: File | null) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Разрешён только PDF");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("PDF файл слишком большой. Максимум 50 МБ");
      return;
    }

    setError("");
    setPdfFile(file);
    setPdfFileName(file.name);
    setIsDirty(true);
    if (form.pdfUrl) {
      setForm((prev) => ({ ...prev, pdfUrl: "" }));
    }
  }

  function removeCoverFile() {
    setCoverFile(null);
    setCoverPreview(editingIssue?.coverImageUrl || null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function removePdfFile() {
    setPdfFile(null);
    setPdfFileName(editingIssue?.pdfUrl ? "PDF загружен" : null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  async function submitForm() {
    if (!canSave) {
      setError("Заполните обязательные поля: заголовок и дата публикации");
      return;
    }

    if (form.isPublished && !willHaveCover) {
      setError("Для публикации необходимо загрузить обложку");
      return;
    }

    setSaving(true);
    setError("");

    const isEdit = Boolean(editingIssue);
    const needsDeferredPublish = coverFile && form.isPublished && (
      !isEdit || !editingIssue?.coverImageUrl
    );

    const initialPayload = {
      title: form.title,
      issueNumber: form.issueNumber || null,
      publicationDate: `${form.publicationDate}T12:00:00.000Z`,
      description: form.description || null,
      coverAlt: form.coverAlt || null,
      landingUrl: form.landingUrl || null,
      pdfUrl: (!pdfFile && form.pdfUrl) ? form.pdfUrl : null,
      isPublished: needsDeferredPublish ? false : form.isPublished,
      isFeatured: form.isFeatured,
    };

    try {
      const endpoint = isEdit ? `/api/admin/journal/${editingIssue?.id}` : "/api/admin/journal";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialPayload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save issue");

      const issueId = data.issue.id as string;

      if (coverFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", coverFile);

        const uploadResponse = await fetch(`/api/admin/journal/${issueId}/upload-cover`, {
          method: "POST",
          body: fd,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Cover upload failed");
        }
      }

      if (pdfFile) {
        setUploading(true);
        const pdfFd = new FormData();
        pdfFd.append("file", pdfFile);

        const pdfResponse = await fetch(`/api/admin/journal/${issueId}/upload-pdf`, {
          method: "POST",
          body: pdfFd,
        });

        const pdfData = await pdfResponse.json();
        if (!pdfResponse.ok) {
          throw new Error(pdfData.error || "PDF upload failed");
        }
      }

      if (needsDeferredPublish) {
        const publishResponse = await fetch(`/api/admin/journal/${issueId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: true }),
        });

        const publishData = await publishResponse.json();
        if (!publishResponse.ok) {
          throw new Error(publishData.error || "Failed to publish issue");
        }
      }

      await fetchIssues();
      setIsDirty(false);
      setSuccess(isEdit ? "Выпуск обновлён" : "Выпуск создан");
      resetForm();
    } catch (submitError) {
      console.error("[Admin Journal] submit error:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Ошибка сохранения выпуска");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function removeIssue(issue: JournalIssue) {
    const shouldDelete = confirm(`Удалить выпуск «${issue.title}»? Это действие необратимо.`);
    if (!shouldDelete) return;

    try {
      const response = await fetch(`/api/admin/journal/${issue.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");
      setSuccess(`Выпуск «${issue.title}» удалён`);
      await fetchIssues();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка удаления");
    }
  }

  async function togglePublish(issue: JournalIssue) {
    if (!issue.isPublished && !issue.coverImageUrl) {
      setError(`Невозможно опубликовать «${issue.title}» — сначала загрузите обложку`);
      return;
    }

    try {
      const response = await fetch(`/api/admin/journal/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !issue.isPublished }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");

      setSuccess(issue.isPublished ? `«${issue.title}» снят с публикации` : `«${issue.title}» опубликован`);
      await fetchIssues();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Ошибка обновления");
    }
  }

  async function toggleFeatured(issue: JournalIssue) {
    try {
      const response = await fetch(`/api/admin/journal/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !issue.isFeatured }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");

      await fetchIssues();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Ошибка обновления");
    }
  }

  const isBusy = saving || uploading;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-3">
            <span className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </span>
            Журнал
          </h1>
          <p className="text-stone-500 text-sm mt-1">Управление выпусками журнала</p>
        </div>

        {viewMode === "list" ? (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-black transition-colors focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Новый выпуск
          </button>
        ) : (
          <button
            onClick={() => {
              if (isDirty && !confirm("Есть несохранённые изменения. Вернуться к списку?")) return;
              resetForm();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            К списку
          </button>
        )}
      </div>

      {/* Feedback banners */}
      <div aria-live="polite" className="space-y-3 mb-6">
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-100 bg-red-50 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {error}
            <button
              onClick={() => setError("")}
              className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors"
              aria-label="Закрыть ошибку"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ─── LIST VIEW ─── */}
      {viewMode === "list" ? (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-stone-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Загрузка…
            </div>
          ) : issues.length === 0 ? (
            <div className="p-16 text-center">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-4" aria-hidden="true" />
              <p className="text-stone-500 mb-1">Пока нет выпусков журнала</p>
              <p className="text-stone-400 text-sm">Создайте первый выпуск, нажав кнопку выше</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {issues.map((issue) => (
                <div key={issue.id} className="p-4 md:p-5 flex gap-4 items-start hover:bg-stone-50/50 transition-colors">
                  {/* Cover thumbnail */}
                  <div className="w-20 h-28 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                    {issue.coverImageUrl ? (
                      <img
                        src={issue.coverImageUrl}
                        alt={issue.coverAlt || issue.title}
                        className="w-full h-full object-cover"
                        width={80}
                        height={112}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-stone-300" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-stone-900 truncate">{issue.title}</h3>
                      {issue.issueNumber && (
                        <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full shrink-0">
                          №&nbsp;{issue.issueNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {issue.isPublished ? (
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Опубликован</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">Черновик</span>
                      )}
                      {issue.isFeatured && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">В баннере</span>
                      )}
                      {!issue.coverImageUrl && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Нет обложки</span>
                      )}
                      {issue.pdfUrl && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">PDF</span>
                      )}
                    </div>

                    <p className="text-xs text-stone-500">
                      {dateFormatter.format(new Date(issue.publicationDate))}
                    </p>

                    {issue.description && (
                      <p className="text-sm text-stone-500 line-clamp-1 mt-1">{issue.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePublish(issue)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                      aria-label={issue.isPublished ? "Снять с публикации" : "Опубликовать"}
                      title={issue.isPublished ? "Снять с публикации" : "Опубликовать"}
                    >
                      {issue.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => toggleFeatured(issue)}
                      className={`p-2 rounded-lg transition-colors ${
                        issue.isFeatured
                          ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                          : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                      }`}
                      aria-label={issue.isFeatured ? "Убрать из баннера" : "Показать в баннере"}
                      title={issue.isFeatured ? "Убрать из баннера" : "Показать в баннере"}
                    >
                      <Star className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEdit(issue)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                      aria-label="Редактировать"
                      title="Редактировать"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => removeIssue(issue)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Удалить"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── CREATE / EDIT FORM ─── */
        <div className="space-y-6">
          {/* Section 1: Basic Info */}
          <fieldset className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6">
            <legend className="text-sm font-semibold text-stone-900 px-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stone-400" aria-hidden="true" />
              Основная информация
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-medium">Заголовок <span className="text-red-500">*</span></span>
                <input
                  value={form.title}
                  onChange={(e) => onFieldChange("title", e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow"
                  placeholder="VetMed Journal — весна 2026…"
                  name="title"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-medium">Номер выпуска</span>
                <input
                  value={form.issueNumber}
                  onChange={(e) => onFieldChange("issueNumber", e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow"
                  placeholder="1/2026…"
                  name="issueNumber"
                  autoComplete="off"
                />
              </label>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-medium">Дата публикации <span className="text-red-500">*</span></span>
                <input
                  type="date"
                  value={form.publicationDate}
                  onChange={(e) => onFieldChange("publicationDate", e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow"
                  name="publicationDate"
                  required
                />
              </label>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-medium">Alt для обложки</span>
                <input
                  value={form.coverAlt}
                  onChange={(e) => onFieldChange("coverAlt", e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow"
                  placeholder="Описание обложки для SEO…"
                  name="coverAlt"
                  autoComplete="off"
                />
              </label>

              <label className="space-y-1.5 text-sm text-stone-700 md:col-span-2">
                <span className="font-medium">Описание</span>
                <textarea
                  value={form.description}
                  onChange={(e) => onFieldChange("description", e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow min-h-[100px] resize-y"
                  placeholder="Краткое описание выпуска…"
                  name="description"
                />
                <span className="text-xs text-stone-400 block text-right tabular-nums">{form.description.length}/2000</span>
              </label>
            </div>
          </fieldset>

          {/* Section 2: Cover & Files */}
          <fieldset className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6">
            <legend className="text-sm font-semibold text-stone-900 px-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-stone-400" aria-hidden="true" />
              Обложка и файлы
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Cover upload zone */}
              <div className="space-y-3">
                <span className="text-sm font-medium text-stone-700 block">JPEG-обложка</span>
                <label
                  className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    coverDragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
                  onDragLeave={() => setCoverDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCoverDragOver(false);
                    onCoverSelected(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <Upload className="w-6 h-6 text-stone-400 mb-2" aria-hidden="true" />
                  <span className="text-sm text-stone-500 text-center px-4">
                    {coverFile ? coverFile.name : "Перетащите или выберите файл…"}
                  </span>
                  <span className="text-xs text-stone-400 mt-1">JPEG, до 10&nbsp;МБ</span>
                  {coverFile && (
                    <span className="text-xs text-emerald-600 mt-1">{formatBytes(coverFile.size)}</span>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg"
                    onChange={(e) => onCoverSelected(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                {coverFile && (
                  <button
                    type="button"
                    onClick={removeCoverFile}
                    className="text-xs text-stone-500 hover:text-red-600 transition-colors"
                  >
                    Отменить выбор файла
                  </button>
                )}
              </div>

              {/* Cover preview */}
              <div className="space-y-3">
                <span className="text-sm font-medium text-stone-700 block">Предпросмотр</span>
                <div className="w-40 h-56 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt={form.coverAlt || "Обложка выпуска"}
                      className="w-full h-full object-cover"
                      width={160}
                      height={224}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                      <ImageIcon className="w-8 h-8 mb-2" aria-hidden="true" />
                      <span className="text-xs">Нет обложки</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PDF + Landing URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-stone-100">
              <div className="space-y-3">
                <span className="text-sm font-medium text-stone-700 block">PDF журнала</span>
                <label
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    pdfDragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
                  onDragLeave={() => setPdfDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setPdfDragOver(false);
                    onPdfSelected(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <FileText className="w-5 h-5 text-stone-400 mb-1.5" aria-hidden="true" />
                  <span className="text-sm text-stone-500 text-center px-4">
                    {pdfFile ? pdfFile.name : pdfFileName || "Перетащите или выберите PDF…"}
                  </span>
                  <span className="text-xs text-stone-400 mt-1">До 50&nbsp;МБ</span>
                  {pdfFile && (
                    <span className="text-xs text-emerald-600 mt-1">{formatBytes(pdfFile.size)}</span>
                  )}
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => onPdfSelected(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                {pdfFile && (
                  <button
                    type="button"
                    onClick={removePdfFile}
                    className="text-xs text-stone-500 hover:text-red-600 transition-colors"
                  >
                    Отменить выбор файла
                  </button>
                )}

                {!pdfFile && (
                  <div className="pt-1">
                    <label className="text-xs text-stone-400 block mb-1">Или вставьте URL:</label>
                    <input
                      value={form.pdfUrl}
                      onChange={(e) => onFieldChange("pdfUrl", e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow"
                      placeholder="https://…"
                      name="pdfUrl"
                      type="url"
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-medium">Landing URL</span>
                <input
                  value={form.landingUrl}
                  onChange={(e) => onFieldChange("landingUrl", e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-shadow"
                  placeholder="https://…"
                  name="landingUrl"
                  type="url"
                  autoComplete="off"
                />
                <span className="text-xs text-stone-400 block">Ссылка на внешнюю страницу выпуска</span>
              </label>
            </div>
          </fieldset>

          {/* Section 3: Publication */}
          <fieldset className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6">
            <legend className="text-sm font-semibold text-stone-900 px-1 flex items-center gap-2">
              <Eye className="w-4 h-4 text-stone-400" aria-hidden="true" />
              Публикация
            </legend>

            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => onFieldChange("isPublished", e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-stone-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                </div>
                <div>
                  <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">Опубликовать</span>
                  <p className="text-xs text-stone-400">Выпуск станет доступен на сайте</p>
                </div>
              </label>

              {form.isPublished && !willHaveCover && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>Для публикации необходимо загрузить обложку</span>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => onFieldChange("isFeatured", e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-stone-200 rounded-full peer-checked:bg-amber-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                </div>
                <div>
                  <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">Показать в баннере</span>
                  <p className="text-xs text-stone-400">Отобразится на главной странице</p>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Action bar */}
          <div className="flex gap-3 justify-end sticky bottom-6">
            <button
              type="button"
              onClick={() => {
                if (isDirty && !confirm("Есть несохранённые изменения. Отменить?")) return;
                resetForm();
              }}
              className="px-5 py-2.5 border border-stone-200 bg-white rounded-xl text-stone-600 hover:bg-stone-50 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
              disabled={isBusy}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={submitForm}
              className="px-5 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-black disabled:opacity-60 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 inline-flex items-center gap-2"
              disabled={!canSave || isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  {uploading ? "Загрузка файлов…" : "Сохранение…"}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Сохранить выпуск
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
