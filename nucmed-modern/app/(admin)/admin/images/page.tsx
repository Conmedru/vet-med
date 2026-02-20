"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Trash2, RefreshCw, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ImageData {
  id: string;
  originalUrl: string;
  storedUrl: string | null;
  thumbnailSmUrl: string | null;
  thumbnailMdUrl: string | null;
  caption: string | null;
  isCover: boolean;
  width: number | null;
  height: number | null;
  createdAt: string;
  article: {
    id: string;
    title: string | null;
    titleOriginal: string;
  } | null;
  hasEmbedding: boolean;
}

interface Stats {
  total: number;
  withS3: number;
  withEmbeddings: number;
}

export default function AdminImagesPage() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, withS3: 0, withEmbeddings: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "no-s3" | "no-embedding">("all");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      
      const res = await fetch(`/api/admin/images?${params}`);
      const data = await res.json();
      setImages(data.images || []);
      setStats(data.stats || { total: 0, withS3: 0, withEmbeddings: 0 });
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    
    setProcessing(id);
    try {
      await fetch(`/api/admin/images/${id}`, { method: "DELETE" });
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error("Failed to delete image:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReembed = async (id: string) => {
    setProcessing(id);
    try {
      await fetch(`/api/admin/images/${id}/embed`, { method: "POST" });
      fetchImages();
    } catch (error) {
      console.error("Failed to re-embed image:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleBatchEmbed = async () => {
    if (!confirm("Generate embeddings for all images without embeddings? This may take a while.")) return;
    
    setProcessing("batch");
    try {
      await fetch("/api/admin/images/embed-all", { method: "POST" });
      fetchImages();
    } catch (error) {
      console.error("Failed to batch embed:", error);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Изображения</h1>
          <p className="text-stone-500 mt-1">Управление изображениями статей</p>
        </div>
        <button
          onClick={handleBatchEmbed}
          disabled={processing === "batch"}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${processing === "batch" ? "animate-spin" : ""}`} />
          {processing === "batch" ? "Обработка..." : "Создать эмбеддинги"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
          <p className="text-sm font-medium text-stone-500">Всего</p>
          <p className="text-3xl font-semibold text-stone-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
          <p className="text-sm font-medium text-stone-500">В S3</p>
          <p className="text-3xl font-semibold text-emerald-600 mt-1">{stats.withS3}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
          <p className="text-sm font-medium text-stone-500">С эмбеддингами</p>
          <p className="text-3xl font-semibold text-blue-600 mt-1">{stats.withEmbeddings}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5 mb-6">
        <div className="flex gap-4 items-center">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder="Поиск по подписи или названию статьи..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          
          <div className="flex gap-2">
            {(["all", "no-s3", "no-embedding"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  filter === f 
                    ? "bg-stone-900 text-white" 
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f === "all" ? "Все" : f === "no-s3" ? "Без S3" : "Без эмбеддинга"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/60 p-12 text-center">
          <ImageIcon className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Изображения не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden group hover:shadow-lg hover:shadow-stone-200/50 transition-all"
            >
              <div className="aspect-square relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailMdUrl || image.storedUrl || image.originalUrl}
                  alt={image.caption || "Image"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  {image.isCover && (
                    <Badge variant="secondary" className="text-xs">Cover</Badge>
                  )}
                  {image.storedUrl && (
                    <Badge variant="default" className="text-xs bg-green-600">S3</Badge>
                  )}
                  {image.hasEmbedding && (
                    <Badge variant="default" className="text-xs bg-blue-600">CLIP</Badge>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleReembed(image.id)}
                    disabled={processing === image.id}
                  >
                    <RefreshCw className={`h-4 w-4 ${processing === image.id ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                    disabled={processing === image.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <a
                    href={image.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="icon" variant="secondary">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {image.article?.title || image.article?.titleOriginal || "Без статьи"}
                </p>
                {image.caption && (
                  <p className="text-xs text-stone-500 truncate mt-1">
                    {image.caption}
                  </p>
                )}
                {image.width && image.height && (
                  <p className="text-xs text-stone-400 mt-1">
                    {image.width}×{image.height}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
