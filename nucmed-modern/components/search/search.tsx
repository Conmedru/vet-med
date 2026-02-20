"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon, Clock, FileText, Sparkles, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SearchResult {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string | null;
  category: string | null;
  similarity?: number;
  matchType: "vector" | "text";
}

interface ImageSearchResult {
  imageId: string;
  url: string;
  similarity: number;
}

interface SearchResponse {
  query: string;
  mode: string;
  results: SearchResult[];
  total: number;
  latencyMs: number;
}

interface ImageSearchResponse {
  query: string;
  results: ImageSearchResult[];
  count: number;
}

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [imageResults, setImageResults] = useState<ImageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [imageResponse, setImageResponse] = useState<ImageSearchResponse | null>(null);
  const [mode, setMode] = useState<"vector" | "text" | "hybrid" | "image">("hybrid");

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setImageResults([]);
      setSearchResponse(null);
      setImageResponse(null);
      return;
    }

    setIsLoading(true);
    
    try {
      if (mode === "image") {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: "20",
        });
        const response = await fetch(`/api/images/search?${params}`);
        const data: ImageSearchResponse = await response.json();
        
        if (response.ok) {
          setImageResults(data.results);
          setImageResponse(data);
          setResults([]); // Clear text results
        } else {
          console.error("Image search failed:", data);
          setImageResults([]);
        }
      } else {
        const params = new URLSearchParams({
          q: searchQuery,
          mode,
          limit: "20",
        });

        const response = await fetch(`/api/search?${params}`);
        const data: SearchResponse = await response.json();

        if (response.ok) {
          setResults(data.results);
          setSearchResponse(data);
          setImageResults([]); // Clear image results
        } else {
          console.error("Search failed:", data);
          setResults([]);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setImageResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query, mode]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={mode === "image" ? "Опишите изображение..." : "Поиск по статьям..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-32"
        />
        
        {/* Search Mode Selector */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <Button
            variant={mode === "hybrid" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("hybrid")}
            className="h-7 px-2 text-xs"
            title="Гибридный поиск"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI
          </Button>
          <Button
            variant={mode === "vector" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("vector")}
            className="h-7 px-2 text-xs hidden sm:flex"
            title="Векторный поиск"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Вектор
          </Button>
          <Button
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
            className="h-7 px-2 text-xs hidden sm:flex"
            title="Текстовый поиск"
          >
            <FileText className="h-3 w-3 mr-1" />
            Текст
          </Button>
          <Button
            variant={mode === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("image")}
            className="h-7 px-2 text-xs"
            title="Поиск изображений"
          >
            <ImageIcon className="h-3 w-3 mr-1" />
            Фото
          </Button>
        </div>
      </div>

      {/* Search Stats */}
      {(searchResponse || imageResponse) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {mode === "image" 
              ? `${imageResponse?.count || 0} изображений` 
              : `${searchResponse?.total || 0} результатов`} для "{query}"
          </span>
          {searchResponse && <span>{searchResponse.latencyMs}ms</span>}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={mode === "image" ? "grid grid-cols-2 md:grid-cols-4 gap-4" : "space-y-4"}>
          {[...Array(mode === "image" ? 8 : 3)].map((_, i) => (
            mode === "image" ? (
              <div key={i} className="aspect-square bg-muted rounded animate-pulse" />
            ) : (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full mb-1"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}

      {/* Article Results */}
      {!isLoading && mode !== "image" && results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <Link href={`/news/${result.slug || result.id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {result.category && (
                          <Badge variant="secondary" className="text-xs">
                            {result.category}
                          </Badge>
                        )}
                        {result.similarity && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.similarity * 100)}% совпадение
                          </Badge>
                        )}
                        <Badge 
                          variant={result.matchType === "vector" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {result.matchType === "vector" ? "AI-поиск" : "Текстовый"}
                        </Badge>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2 hover:text-primary transition-colors">
                        {result.title}
                      </h3>
                      
                      {result.excerpt && (
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {result.excerpt}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Читать →
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Results */}
      {!isLoading && mode === "image" && imageResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imageResults.map((result) => (
            <div key={result.imageId} className="group relative aspect-square bg-muted rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={result.url} 
                alt="Search result" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <Badge variant="secondary" className="text-xs backdrop-blur-md bg-white/80">
                  {Math.round(result.similarity * 100)}% match
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && query.length >= 2 && 
       ((mode !== "image" && results.length === 0) || (mode === "image" && imageResults.length === 0)) && (
        <Card>
          <CardContent className="p-12 text-center">
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ничего не найдено</h3>
            <p className="text-muted-foreground">
              Попробуйте изменить поисковый запрос или режим поиска
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!isLoading && query.length < 2 && (
        <Card>
          <CardContent className="p-12 text-center">
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Поиск</h3>
            <p className="text-muted-foreground mb-4">
              Введите минимум 2 символа для поиска
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>AI-поиск</strong>: семантический поиск по смыслу</p>
              <p>• <strong>Фото</strong>: поиск изображений по описанию</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
