"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Eye, 
  Edit3,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  Check,
  Calendar,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { CATEGORIES } from "@/lib/schemas/article";
import { ANIMAL_CATEGORIES, NOSOLOGIES, SPECIAL_SECTIONS } from "@/lib/config/constants";

export default function NewArticlePage() {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [significanceScore, setSignificanceScore] = useState<number | "">("")

  async function handleSave(publish: boolean = false) {
    if (!title.trim()) {
      setError("Заголовок обязателен");
      return;
    }
    if (!content.trim()) {
      setError("Текст статьи обязателен");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt: excerpt || undefined,
          content,
          category: category || undefined,
          tags,
          externalUrl: externalUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          significanceScore: significanceScore || undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          status: publish ? "PUBLISHED" : (scheduledAt ? "SCHEDULED" : "DRAFT"),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create article");
      }

      const article = await response.json();
      
      if (publish) {
        router.push("/admin/queue?status=PUBLISHED");
      } else {
        router.push(`/admin/articles/${article.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
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

  async function handleGenerateCover() {
    if (!title.trim()) {
      setError("Для генерации обложки нужен заголовок");
      return;
    }
    if (!content.trim()) {
      setError("Для генерации обложки нужен текст статьи");
      return;
    }

    setIsGeneratingCover(true);
    setError("");

    try {
      const response = await fetch("/api/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt: excerpt || content.substring(0, 300),
          category: category || "Визуализация",
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Ошибка генерации обложки");
      }

      const data = await response.json();
      setCoverImageUrl(data.coverImageUrl);
      setSuccessMessage("Обложка сгенерирована!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(message);
    } finally {
      setIsGeneratingCover(false);
    }
  }

  function insertMarkdown(syntax: string, placeholder: string = "") {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;
    
    let newText = "";
    let cursorOffset = 0;

    switch (syntax) {
      case "h2":
        newText = `\n## ${selectedText}\n`;
        cursorOffset = 4;
        break;
      case "h3":
        newText = `\n### ${selectedText}\n`;
        cursorOffset = 5;
        break;
      case "bold":
        newText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case "italic":
        newText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case "link":
        newText = `[${selectedText}](url)`;
        cursorOffset = 1;
        break;
      case "list":
        newText = `\n- ${selectedText}\n`;
        cursorOffset = 3;
        break;
      default:
        return;
    }

    const before = content.substring(0, start);
    const after = content.substring(end);
    setContent(before + newText + after);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + cursorOffset + (selectedText === placeholder ? 0 : selectedText.length);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/queue">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold">Новая статья</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Создание статьи вручную
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <Edit3 className="h-4 w-4 mr-2" />
              Редактор
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Превью
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Editor / Preview */}
        <div className="lg:col-span-2 space-y-6">
          {showPreview ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Предпросмотр</CardTitle>
              </CardHeader>
              <CardContent>
                <article className="prose prose-lg max-w-none">
                  {/* Cover Image Preview */}
                  {coverImageUrl && (
                    <div className="aspect-video mb-6 rounded-lg overflow-hidden bg-muted -mx-2">
                      <img
                        src={coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {category && (
                    <Badge variant="secondary" className="mb-4">{category}</Badge>
                  )}
                  <h1 className="text-3xl font-bold mb-4">
                    {title || "Без заголовка"}
                  </h1>
                  {excerpt && (
                    <p className="text-xl text-muted-foreground mb-6 lead">
                      {excerpt}
                    </p>
                  )}
                  <div className="prose prose-lg max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                    prose-p:leading-relaxed
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:font-semibold">
                    <ReactMarkdown>{content || "*Текст статьи пуст*"}</ReactMarkdown>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-8 pt-4 border-t flex gap-2 flex-wrap">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </article>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Контент</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Заголовок *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Заголовок статьи"
                    className="text-lg"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Лид (краткое описание)</label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="2-3 предложения о сути статьи (до 160 символов для SEO)"
                    rows={2}
                    maxLength={200}
                    className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{excerpt.length}/200</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Текст статьи (Markdown) *</label>
                    <div className="flex gap-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => insertMarkdown("h2", "Заголовок")}
                      >
                        H2
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => insertMarkdown("h3", "Подзаголовок")}
                      >
                        H3
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs font-bold"
                        onClick={() => insertMarkdown("bold", "текст")}
                      >
                        B
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs italic"
                        onClick={() => insertMarkdown("italic", "текст")}
                      >
                        I
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => insertMarkdown("link", "ссылка")}
                      >
                        🔗
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => insertMarkdown("list", "пункт")}
                      >
                        •
                      </Button>
                    </div>
                  </div>
                  <textarea
                    name="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="## Введение&#10;&#10;Текст статьи...&#10;&#10;## Ключевые результаты&#10;&#10;- Пункт 1&#10;- Пункт 2"
                    rows={16}
                    className="w-full px-3 py-2 border rounded-lg resize-y font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Сохранение..." : "Сохранить черновик"}
              </Button>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={() => handleSave(true)}
                disabled={isSaving}
              >
                <Send className="h-4 w-4 mr-2" />
                Опубликовать
              </Button>

              {/* Scheduled Publishing */}
              <div className="pt-3 border-t">
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Запланировать публикацию
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="text-sm"
                />
                {scheduledAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    При сохранении черновика статья будет запланирована
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Метаданные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
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

              {/* Significance Score */}
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Значимость (1-10)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={significanceScore}
                  onChange={(e) => setSignificanceScore(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Оценка важности новости"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Высокий балл = приоритет в ленте
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Теги</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Добавить тег"
                  />
                  <Button variant="outline" onClick={addTag}>+</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">URL источника (опционально)</label>
                <Input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>

              {/* Cover Image Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium block">Обложка</label>
                
                {/* Cover Preview */}
                {coverImageUrl ? (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setCoverImageUrl("")}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 opacity-50" />
                    <span className="text-xs">Нет обложки</span>
                  </div>
                )}

                {/* AI Generate Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateCover}
                  disabled={isGeneratingCover || !title.trim() || !content.trim()}
                >
                  {isGeneratingCover ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Сгенерировать AI
                    </>
                  )}
                </Button>
                {(!title.trim() || !content.trim()) && (
                  <p className="text-xs text-muted-foreground">
                    Для генерации нужны заголовок и текст
                  </p>
                )}

                {/* Manual URL Input */}
                <div className="pt-2 border-t">
                  <label className="text-xs text-muted-foreground mb-1 block">Или вставьте URL</label>
                  <Input
                    value={coverImageUrl.startsWith('data:') ? '' : coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://..."
                    type="url"
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <h4 className="text-sm font-medium mb-2">Markdown</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">## Заголовок</code> — H2</li>
                <li><code className="bg-muted px-1 rounded">### Подзаголовок</code> — H3</li>
                <li><code className="bg-muted px-1 rounded">**жирный**</code></li>
                <li><code className="bg-muted px-1 rounded">*курсив*</code></li>
                <li><code className="bg-muted px-1 rounded">[текст](url)</code> — ссылка</li>
                <li><code className="bg-muted px-1 rounded">- пункт</code> — список</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
