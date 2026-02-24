"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, HelpCircle, FlaskConical, CheckCircle2, AlertTriangle } from "lucide-react";

interface Source {
  id: string;
  name: string;
  slug: string;
  url: string;
  adapterType: "rss" | "playwright" | "html";
  adapterConfig: Record<string, any>;
  isActive: boolean;
  scrapeIntervalMinutes: number;
}

interface PreviewItem {
  externalId: string;
  externalUrl: string;
  title: string;
  publishedAt: string | null;
  imageCount: number;
  hasCover: boolean;
}

interface PreviewResult {
  sourceId: string;
  sourceName: string;
  adapterType: "rss" | "playwright" | "html";
  configVersion: number;
  durationMs: number;
  totalFetched: number;
  sample: PreviewItem[];
}

export default function SourceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [hasValidatedPreview, setHasValidatedPreview] = useState(false);
  const [lastPreviewSignature, setLastPreviewSignature] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adapterType, setAdapterType] = useState<"rss" | "playwright" | "html">("rss");
  const [interval, setInterval] = useState(1440);
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});

  function buildConfigSignature() {
    return JSON.stringify({
      name,
      url,
      adapterType,
      interval,
      isActive,
      config,
    });
  }

  useEffect(() => {
    loadSource();
  }, [id]);

  async function loadSource() {
    try {
      const response = await fetch(`/api/sources/${id}`);
      if (!response.ok) throw new Error("Source not found");

      const data = await response.json();
      setSource(data);

      // Populate form
      setName(data.name);
      setUrl(data.url);
      setAdapterType(data.adapterType);
      setInterval(data.scrapeIntervalMinutes);
      setIsActive(data.isActive);
      const loadedConfig = {
        version: 1,
        ...(data.adapterConfig || {}),
      };
      setConfig(loadedConfig);

      const signature = JSON.stringify({
        name: data.name,
        url: data.url,
        adapterType: data.adapterType,
        interval: data.scrapeIntervalMinutes,
        isActive: data.isActive,
        config: loadedConfig,
      });
      setLastPreviewSignature(signature);
      setHasValidatedPreview(true);
    } catch (err) {
      setError("Не удалось загрузить источник");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!lastPreviewSignature) return;
    setHasValidatedPreview(buildConfigSignature() === lastPreviewSignature);
  }, [name, url, adapterType, interval, isActive, config, lastPreviewSignature]);

  async function handlePreview() {
    setIsPreviewing(true);
    setPreviewError("");
    setError("");

    try {
      const response = await fetch(`/api/sources/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: 5,
          url,
          adapterType,
          adapterConfig: config,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Preview failed");
      }

      setPreviewResult(data);

      const validRows = data.sample.filter(
        (row: PreviewItem) => row.title?.trim().length > 0 && row.externalUrl?.trim().length > 0
      ).length;
      const qualityRatio = data.sample.length > 0 ? validRows / data.sample.length : 0;

      if (data.totalFetched === 0 || qualityRatio < 0.8) {
        setHasValidatedPreview(false);
        setPreviewError("Предпросмотр не прошёл порог качества (минимум 80% валидных элементов)");
        return;
      }

      const signature = buildConfigSignature();
      setLastPreviewSignature(signature);
      setHasValidatedPreview(true);
    } catch (err) {
      setHasValidatedPreview(false);
      setPreviewError(err instanceof Error ? err.message : "Ошибка предпросмотра");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSave() {
    if (!hasValidatedPreview) {
      setError("Перед сохранением запустите предпросмотр и убедитесь, что он прошёл проверку качества");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          adapterType,
          scrapeIntervalMinutes: interval,
          isActive,
          adapterConfig: config,
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      router.push("/admin/sources");
    } catch (err: any) {
      setError("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  }

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) return <div className="p-10 text-center">Загрузка...</div>;
  if (!source) return <div className="p-10 text-center">Источник не найден</div>;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/sources">
          <button className="p-2.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-stone-900">
            Редактирование источника
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Info */}
        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-5">
          <h3 className="font-semibold text-stone-900 border-b border-stone-100 pb-4 mb-4">Основные настройки</h3>

          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-sm font-medium text-stone-700 mb-2 block">Название</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-stone-700 mb-2 block">URL источника</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Тип адаптера</label>
              <select
                value={adapterType}
                onChange={(e) => setAdapterType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="rss">RSS Feed</option>
                <option value="playwright">Playwright</option>
                <option value="html">HTML Scraper</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Интервал (мин)</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isActive" className="text-stone-700 font-medium cursor-pointer">
                Активен (включить парсинг)
              </label>
            </div>
          </div>
        </div>

        {/* Adapter Config */}
        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-5">
          <h3 className="font-semibold text-stone-900 border-b border-stone-100 pb-4 mb-4 flex items-center gap-2">
            Настройки адаптера ({adapterType})
            <a href="https://playwright.dev/docs/locators" target="_blank" className="text-stone-400 hover:text-emerald-600">
              <HelpCircle className="h-4 w-4" />
            </a>
          </h3>

          {adapterType === "rss" ? (
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">RSS Feed URL</label>
              <input
                type="text"
                value={config.feedUrl || ""}
                onChange={(e) => handleConfigChange("feedUrl", e.target.value)}
                placeholder="https://example.com/rss.xml"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 mb-4">
                Используйте CSS селекторы для указания элементов на странице.
                Например: <code>.article-item</code>, <code>h1.title</code>, <code>.content</code>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">Версия конфигурации</label>
                <input
                  type="number"
                  min={1}
                  value={config.version || 1}
                  onChange={(e) => handleConfigChange("version", Number(e.target.value) || 1)}
                  className="w-full max-w-[220px] px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl mb-4"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">List URL (если отличается)</label>
                <input
                  type="text"
                  value={config.listUrl || ""}
                  onChange={(e) => handleConfigChange("listUrl", e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Article Selector (контейнер)</label>
                  <input
                    type="text"
                    value={config.articleSelector || ""}
                    onChange={(e) => handleConfigChange("articleSelector", e.target.value)}
                    placeholder=".news-item"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Link Selector</label>
                  <input
                    type="text"
                    value={config.linkSelector || ""}
                    onChange={(e) => handleConfigChange("linkSelector", e.target.value)}
                    placeholder="a.title"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Title Selector</label>
                  <input
                    type="text"
                    value={config.titleSelector || ""}
                    onChange={(e) => handleConfigChange("titleSelector", e.target.value)}
                    placeholder="h1"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Content Selector</label>
                  <input
                    type="text"
                    value={config.contentSelector || ""}
                    onChange={(e) => handleConfigChange("contentSelector", e.target.value)}
                    placeholder=".article-body"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Date Selector</label>
                  <input
                    type="text"
                    value={config.dateSelector || ""}
                    onChange={(e) => handleConfigChange("dateSelector", e.target.value)}
                    placeholder=".date"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Image Selector</label>
                  <input
                    type="text"
                    value={config.imageSelector || ""}
                    onChange={(e) => handleConfigChange("imageSelector", e.target.value)}
                    placeholder="img.featured"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview scrape */}
        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-900">Предпросмотр парсинга</h3>
              <p className="text-sm text-stone-500 mt-1">
                Сначала проверьте выборку без записи в БД, затем сохраняйте настройки
              </p>
            </div>
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-70"
            >
              <FlaskConical className={`h-4 w-4 ${isPreviewing ? "animate-spin" : ""}`} />
              {isPreviewing ? "Тестируем..." : "Тестовый запуск"}
            </button>
          </div>

          {hasValidatedPreview ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Предпросмотр прошёл проверку качества, конфиг можно сохранять
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl text-sm">
              <AlertTriangle className="h-4 w-4" />
              Требуется валидный предпросмотр для сохранения
            </div>
          )}

          {previewError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {previewError}
            </div>
          )}

          {previewResult && (
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 text-sm text-stone-700 flex flex-wrap gap-4">
                <span>Найдено: <strong>{previewResult.totalFetched}</strong></span>
                <span>Сэмпл: <strong>{previewResult.sample.length}</strong></span>
                <span>Длительность: <strong>{Math.round(previewResult.durationMs)} ms</strong></span>
                <span>Версия: <strong>v{previewResult.configVersion}</strong></span>
              </div>
              <div className="divide-y divide-stone-100">
                {previewResult.sample.map((item) => (
                  <div key={item.externalId} className="px-4 py-3">
                    <div className="font-medium text-stone-900 line-clamp-1">{item.title}</div>
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-800 break-all"
                    >
                      {item.externalUrl}
                    </a>
                    <div className="text-xs text-stone-500 mt-1">
                      images: {item.imageCount} • cover: {item.hasCover ? "yes" : "no"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}
