/**
 * Embedding Service for Vector Search
 * Uses Replicate with replicate/all-mpnet-base-v2 (768 dimensions)
 */

import { prisma } from "../prisma";
import crypto from "crypto";
import Replicate from "replicate";
import { checkRateLimit, recordUsage } from "./rate-limiter";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
// Using specific version hash for stability and to avoid 404s
const EMBEDDING_MODEL_ID = "replicate/all-mpnet-base-v2";
const EMBEDDING_VERSION = "b6b7585c9640cd7a9572c6e129c9549d79c9c31f0d3fdce7baac7c67ca38f305";
const EMBEDDING_FULL_ID = `${EMBEDDING_MODEL_ID}:${EMBEDDING_VERSION}`;
const EMBEDDING_DIMENSIONS = 768;

export interface EmbeddingResult {
  embedding: number[];
  tokens?: number; // Replicate might not return token usage for this model
  model: string;
}

/**
 * Generate embedding for text using Replicate API
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  // Truncate text if too long (max 512 tokens for mpnet ~ 2000 chars safe bet)
  const maxChars = 20000; 
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;
  
  // Estimate tokens and check rate limit
  const estimatedTokens = Math.ceil(truncatedText.length / 4);
  const rateLimitCheck = await checkRateLimit(estimatedTokens);
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
  }

  const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Replicate API request timed out after 30s")), 30000);
    });

    const predictionPromise = replicate.run(
      EMBEDDING_FULL_ID as any,
      {
        input: {
          text_batch: JSON.stringify([truncatedText]),
        }
      }
    );

    const output = await Promise.race([predictionPromise, timeoutPromise]);

    // Output from replicate/all-mpnet-base-v2 is [{ embedding: [...] }]
    if (!Array.isArray(output) || output.length === 0) {
        throw new Error("Invalid response format from Replicate: expected non-empty array");
    }

    // Handle different output formats (just in case)
    let embedding: number[];
    
    // Format: [{ embedding: [...] }]
    if (typeof output[0] === 'object' && output[0] !== null && 'embedding' in output[0]) {
        embedding = (output[0] as any).embedding;
    } 
    // Format: [[...]] (array of arrays)
    else if (Array.isArray(output[0])) {
        embedding = output[0] as number[];
    }
    else {
         console.error("Unknown output format:", JSON.stringify(output).slice(0, 200));
         throw new Error("Unknown output format from Replicate embedding model");
    }
    
    if (!Array.isArray(embedding)) {
        throw new Error("Invalid embedding format: expected array of numbers");
    }

    const tokens = Math.ceil(truncatedText.length / 4);
    
    // Record usage for rate limiting
    await recordUsage(tokens);

    return {
      embedding: embedding,
      tokens,
      model: EMBEDDING_MODEL_ID,
    };
  } catch (error: any) {
    console.error("Replicate embedding error:", error);
    throw new Error(`Replicate API error: ${error.message}`);
  }
}

/**
 * Create content hash for change detection
 */
function createContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Prepare article content for embedding
 * Combines title, excerpt, and content for better semantic representation
 */
function prepareArticleContent(article: {
  title?: string | null;
  titleOriginal: string;
  excerpt?: string | null;
  content?: string | null;
  category?: string | null;
  tags?: string[];
}): string {
  const parts: string[] = [];
  
  // Title (weighted by repetition)
  const title = article.title || article.titleOriginal;
  parts.push(title);
  parts.push(title); // Double weight for title
  
  // Category and tags for context
  if (article.category) {
    parts.push(`Category: ${article.category}`);
  }
  if (article.tags && article.tags.length > 0) {
    parts.push(`Tags: ${article.tags.join(", ")}`);
  }
  
  // Excerpt
  if (article.excerpt) {
    parts.push(article.excerpt);
  }
  
  // Main content (stripped of markdown)
  if (article.content) {
    const cleanContent = article.content
      .replace(/#{1,6}\s/g, "") // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/`([^`]+)`/g, "$1"); // Remove inline code
    parts.push(cleanContent);
  }
  
  return parts.join("\n\n");
}

/**
 * Generate and store embedding for an article
 */
export async function embedArticle(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      titleOriginal: true,
      excerpt: true,
      content: true,
      category: true,
      tags: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // Prepare content and check if update needed
  const content = prepareArticleContent(article);
  const contentHash = createContentHash(content);

  // Check existing embedding
  const existingEmbedding = await prisma.$queryRaw<Array<{ contentHash: string }>>`
    SELECT "contentHash" FROM article_embeddings WHERE "articleId" = ${articleId}
  `;

  // Skip if embedding exists and content hasn't changed
  if (existingEmbedding.length > 0 && existingEmbedding[0].contentHash === contentHash) {
    console.log(`[Embeddings] Article ${articleId} already embedded, skipping`);
    return;
  }

  console.log(`[Embeddings] Generating embedding for article ${articleId}`);
  
  // Generate embedding
  const result = await generateEmbedding(content);

  // Format embedding as string for pgvector '[1.0, 2.0, ...]'
  const vectorString = JSON.stringify(result.embedding);

  // Store embedding using raw SQL (Prisma doesn't support vector type directly)
  await prisma.$executeRaw`
    INSERT INTO article_embeddings (id, "articleId", embedding, model, version, "contentHash", tokens, "createdAt", "updatedAt")
    VALUES (
      ${crypto.randomUUID()},
      ${articleId},
      ${vectorString}::vector,
      ${result.model},
      '1',
      ${contentHash},
      ${result.tokens},
      NOW(),
      NOW()
    )
    ON CONFLICT ("articleId") DO UPDATE SET
      embedding = ${vectorString}::vector,
      model = ${result.model},
      "contentHash" = ${contentHash},
      tokens = ${result.tokens},
      "updatedAt" = NOW()
  `;

  console.log(`[Embeddings] Stored embedding for article ${articleId} (${result.tokens} tokens)`);
}

/**
 * Batch embed multiple articles
 */
export async function embedArticlesBatch(
  articleIds: string[],
  options: { onProgress?: (completed: number, total: number) => void } = {}
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };
  
  for (let i = 0; i < articleIds.length; i++) {
    try {
      await embedArticle(articleIds[i]);
      results.success++;
    } catch (error) {
      results.failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Embeddings] Error embedding article ${articleIds[i]}:`, message);
      results.errors.push(`${articleIds[i]}: ${message}`);
    }
    
    options.onProgress?.(i + 1, articleIds.length);
    
    // Rate limiting: 3000 RPM for ada-002, so ~50/s is safe
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Embed all published articles that don't have embeddings
 */
export async function embedMissingArticles(): Promise<{ success: number; failed: number }> {
  // Find articles without embeddings using raw SQL
  const articles = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT a.id 
    FROM articles a
    LEFT JOIN article_embeddings e ON e."articleId" = a.id
    WHERE a.status = 'PUBLISHED' AND e.id IS NULL
    LIMIT 100
  `;

  if (articles.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`[Embeddings] Found ${articles.length} articles without embeddings`);
  
  const result = await embedArticlesBatch(
    articles.map((a: { id: string }) => a.id),
    {
      onProgress: (completed, total) => {
        console.log(`[Embeddings] Progress: ${completed}/${total}`);
      },
    }
  );

  return { success: result.success, failed: result.failed };
}

/**
 * Search articles by semantic similarity
 */
export async function searchArticlesByVector(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    categoryFilter?: string;
    statusFilter?: string;
  } = {}
): Promise<Array<{
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  similarity: number;
}>> {
  const { limit = 10, threshold = 0.7, categoryFilter, statusFilter = "PUBLISHED" } = options;

  // Generate query embedding
  const queryResult = await generateEmbedding(query);
  const vectorString = JSON.stringify(queryResult.embedding);

  // Build WHERE clause
  const whereClauses = [`a.status = '${statusFilter}'`];
  if (categoryFilter) {
    whereClauses.push(`a.category = '${categoryFilter}'`);
  }
  
  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    slug?: string | null;
    title: string;
    excerpt: string | null;
    category: string | null;
    similarity: number;
  }>>(`
    SELECT 
      a.id,
      a.slug,
      COALESCE(a.title, a."titleOriginal") as title,
      a.excerpt,
      a.category,
      1 - (e.embedding <=> $1::vector) as similarity
    FROM articles a
    JOIN article_embeddings e ON e."articleId" = a.id
    WHERE a.status = $2
      ${categoryFilter ? `AND a.category = '${categoryFilter.replace(/'/g, "''")}'` : ""}
      AND e.embedding IS NOT NULL
      AND 1 - (e.embedding <=> $1::vector) > $3
    ORDER BY e.embedding <=> $1::vector
    LIMIT $4
  `, vectorString, statusFilter, threshold, limit);

  return results;
}

/**
 * Find similar articles to a given article
 */
export async function findSimilarArticles(
  articleId: string,
  limit: number = 5
): Promise<Array<{
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string | null;
  similarity: number;
}>> {
  const results = await prisma.$queryRaw<Array<{
    id: string;
    slug?: string | null;
    title: string;
    excerpt: string | null;
    similarity: number;
  }>>`
    SELECT 
      a.id,
      a.slug,
      COALESCE(a.title, a."titleOriginal") as title,
      a.excerpt,
      1 - (e2.embedding <=> e1.embedding) as similarity
    FROM article_embeddings e1
    JOIN article_embeddings e2 ON e2."articleId" != e1."articleId"
    JOIN articles a ON a.id = e2."articleId"
    WHERE e1."articleId" = ${articleId}
      AND a.status = 'PUBLISHED'
      AND e1.embedding IS NOT NULL
      AND e2.embedding IS NOT NULL
    ORDER BY e2.embedding <=> e1.embedding
    LIMIT ${limit}
  `;

  return results;
}
