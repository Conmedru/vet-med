import { SITE_URL } from "@/lib/config";
/**
 * Newsletter Service
 * Generates weekly digest emails with top articles
 */

import { prisma } from '@/lib/prisma';
import { articleRubrics, PET_SLUGS } from '@/lib/rubrics';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { unisender, DEFAULT_LIST_ID } from '@/lib/unisender';
import { digestDateRange, generateDigestHtml, generateNotificationHtml } from './templates';
import { emailImageUrl } from './email-images';
import { digestUtm, NOTIFICATION_UTM, withUtm } from '@/lib/analytics/utm';

export interface NewsletterArticle {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
  url: string;
  imageUrl: string | null;
}

export interface NewsletterDigest {
  id: string;
  subject: string;
  preheader: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  articles: NewsletterArticle[];
  stats: {
    totalArticles: number;
    byCategory: Record<string, number>;
  };
  html: string;
  plainText: string;
  createdAt: Date;
}

const SITE_NAME = 'CON-VET.ru';

/** Letters in the digest; 15 latest of Sunday was the old choice, now the best of the week */
const DIGEST_SIZE = 12;
/** «Общая ветеринария» is most of the flow: without a cap it fills the whole letter */
const DIGEST_PER_CATEGORY = 3;

function materials(n: number): string {
  const tens = n % 100, ones = n % 10;
  if (tens >= 11 && tens <= 14) return `${n} главных материалов`;
  if (ones === 1) return `${n} главный материал`;
  if (ones >= 2 && ones <= 4) return `${n} главных материала`;
  return `${n} главных материалов`;
}

export async function sendNewArticleNotification(articleId: string) {
  console.log(`[Newsletter] Starting notification for article: ${articleId}`);
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      images: {
        where: { isCover: true },
        take: 1,
      },
    },
  });

  if (!article) {
    console.error(`[Newsletter] Article not found: ${articleId}`);
    throw new Error(`Article not found: ${articleId}`);
  }
  console.log(`[Newsletter] Found article: ${article.title || article.titleOriginal}`);

  // Never fall back to "the first list": the Unisender account is shared with other projects
  const listId = DEFAULT_LIST_ID;

  if (!listId) {
    console.warn("UNISENDER_LIST_ID not set and no lists found, skipping notification");
    return;
  }

  const articleUrl = withUtm(`${SITE_URL}/news/${article.slug || article.id}`, NOTIFICATION_UTM);
  const cover = article.coverImageUrl || article.images[0]?.storedUrl || article.images[0]?.originalUrl || null;
  const imageUrl = await emailImageUrl(cover, `notification/${article.id}`);

  const html = generateNotificationHtml({
    title: article.title || article.titleOriginal || 'Без заголовка',
    excerpt: article.excerpt,
    imageUrl: imageUrl,
    url: articleUrl,
    category: article.category
  });

  const subject = `Новая статья: ${article.title || article.titleOriginal}`;

  // Create campaign and send
  console.log(`Sending new article notification for ${article.id}...`);
  const result = await unisender.createCampaign(
    subject,
    html,
    listId
  );

  if (result.error) {
    console.error("Failed to send article notification:", result);
    throw new Error(`Unisender error: ${result.error}`);
  }

  console.log("Article notification sent successfully:", result);

  // Log to DB
  try {
    await prisma.newsletterCampaign.create({
      data: {
        subject: subject,
        type: 'NOTIFICATION',
        status: 'SENT',
        externalId: result.result?.campaign_id ? String(result.result.campaign_id) : undefined,
        content: html,
        metadata: { articleId: article.id },
        recipientCount: 0, // We might need to fetch this later or get from result
        sentAt: new Date(),
      }
    });
  } catch (dbError) {
    console.error("Failed to log notification campaign to DB:", dbError);
  }

  return result;
}

export async function sendWeeklyDigest(digest: NewsletterDigest) {
  // Never fall back to "the first list": the Unisender account is shared with other projects
  const listId = DEFAULT_LIST_ID;

  if (!listId) {
    console.warn("UNISENDER_LIST_ID not set, skipping digest sending");
    return;
  }

  if (digest.articles.length === 0) {
    console.log("No articles in digest, skipping send");
    return;
  }

  // Email-safe images only for a real send: the admin preview stays fast
  const prepared = await withEmailImages(digest);

  console.log(`Sending weekly digest ${digest.id}...`);
  const result = await unisender.createCampaign(
    prepared.subject,
    prepared.html,
    listId
  );

  if (result.error) {
    console.error("Failed to send digest:", result);
    throw new Error(`Unisender error: ${result.error}`);
  }

  console.log("Weekly digest sent successfully:", result);

  // Log to DB
  try {
    await prisma.newsletterCampaign.create({
      data: {
        subject: digest.subject,
        type: 'DIGEST',
        status: 'SENT',
        externalId: result.result?.campaign_id ? String(result.result.campaign_id) : undefined,
        content: prepared.html,
        metadata: {
          digestId: digest.id,
          articleCount: digest.articles.length,
          dateRange: digest.dateRange
        },
        recipientCount: 0,
        sentAt: new Date(),
      }
    });
  } catch (dbError) {
    console.error("Failed to log digest campaign to DB:", dbError);
  }

  return result;
}

/** The digest with JPEG copies of the covers on our S3 (see emailImageUrl) */
async function withEmailImages(digest: NewsletterDigest): Promise<NewsletterDigest> {
  const articles = await Promise.all(
    digest.articles.map(async (a) => ({ ...a, imageUrl: await emailImageUrl(a.imageUrl, `${digest.id}/${a.id}`) })),
  );
  const prepared = { ...digest, articles };
  return { ...prepared, html: generateDigestHtml(prepared) };
}

/** Subscribers of any of the given categories (subscriptions store rubric/category names) */
export async function getSubscribersForCategories(categories: string[]): Promise<string[]> {
  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "active",
      categories: { hasSome: categories },
    },
    select: { email: true },
  });
  return subscribers.map((s) => s.email);
}

export async function getDigestSubscribers(): Promise<string[]> {
  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "active",
      digestEnabled: true,
    },
    select: { email: true },
  });
  return subscribers.map((s) => s.email);
}

export async function sendCategoryNotification(articleId: string) {
  console.log(`[Newsletter] Starting category notification for article: ${articleId}`);
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      images: {
        where: { isCover: true },
        take: 1,
      },
    },
  });

  if (!article || !article.category) {
    console.log(`[Newsletter] Article not found or no category: ${articleId}`);
    return;
  }

  // Find subscribers of any article rubric (and of the "Питомцы" group for pet articles)
  const rubrics = articleRubrics(article.rubrics);
  const names = [article.category, ...rubrics.map((r) => r.name)];
  if (rubrics.some((r) => PET_SLUGS.includes(r.slug))) names.push("Питомцы");
  const emails = await getSubscribersForCategories([...new Set(names)]);
  if (emails.length === 0) {
    console.log(`[Newsletter] No subscribers for category: ${article.category}`);
    return;
  }

  console.log(`[Newsletter] Sending to ${emails.length} subscribers of "${article.category}"`);

  const articleUrl = `${SITE_URL}/news/${article.slug || article.id}`;
  const imageUrl = article.coverImageUrl || article.images[0]?.storedUrl || article.images[0]?.originalUrl;

  const html = generateNotificationHtml({
    title: article.title || article.titleOriginal || 'Без заголовка',
    excerpt: article.excerpt,
    imageUrl: imageUrl,
    url: articleUrl,
    category: article.category,
  });

  const subject = `[${article.category}] ${article.title || article.titleOriginal}`;

  // Send individual emails to category subscribers
  let sentCount = 0;
  let failCount = 0;
  for (const email of emails) {
    try {
      await unisender.sendEmail(email, subject, html);
      sentCount++;
    } catch (e) {
      console.error(`[Newsletter] Failed to send to ${email}:`, e);
      failCount++;
    }
  }

  console.log(`[Newsletter] Category notification sent: ${sentCount} ok, ${failCount} failed`);

  // Log to DB
  try {
    await prisma.newsletterCampaign.create({
      data: {
        subject,
        type: 'CATEGORY_NOTIFICATION',
        status: failCount === emails.length ? 'FAILED' : 'SENT',
        content: html,
        metadata: {
          articleId: article.id,
          category: article.category,
          targetEmails: emails.length,
        },
        recipientCount: sentCount,
        sentAt: new Date(),
      },
    });
  } catch (dbError) {
    console.error("[Newsletter] Failed to log category notification to DB:", dbError);
  }

  return { sentCount, failCount };
}

export async function generateWeeklyDigest(
  weekOffset: number = 0
): Promise<NewsletterDigest> {
  const now = new Date();
  const targetDate = subDays(now, weekOffset * 7);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  const digestId = `digest-${format(weekStart, 'yyyy-MM-dd')}`;

  // The best of the week, not the latest: ~60 articles a day, so «15 latest» was
  // Sunday afternoon only, scores 1–2 included (2026-11-16)
  const candidates = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      title: { not: null },
      publishedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    orderBy: [
      { significanceScore: { sort: 'desc', nulls: 'last' } },
      { publishedAt: 'desc' },
    ],
    take: 300,
    include: {
      images: {
        where: { isCover: true },
        take: 1,
      },
    },
  });

  const perCategory: Record<string, number> = {};
  const articles = candidates.filter((a) => {
    const cat = a.category || 'Другое';
    if ((perCategory[cat] ?? 0) >= DIGEST_PER_CATEGORY) return false;
    perCategory[cat] = (perCategory[cat] ?? 0) + 1;
    return true;
  }).slice(0, DIGEST_SIZE);

  // Calculate stats
  const byCategory: Record<string, number> = {};
  articles.forEach(a => {
    const cat = a.category || 'Другое';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  const newsletterArticles: NewsletterArticle[] = articles.map(a => ({
    id: a.id,
    title: a.title || a.titleOriginal,
    excerpt: a.excerpt,
    category: a.category,
    publishedAt: a.publishedAt,
    // By slug: /news/<id> redirects to the slug and loses the UTM tags
    url: withUtm(`${SITE_URL}/news/${a.slug || a.id}`, digestUtm(digestId)),
    imageUrl: a.coverImageUrl || a.images[0]?.storedUrl || a.images[0]?.originalUrl || null,
  }));

  const dateRangeStr = digestDateRange(weekStart, weekEnd);

  const digest: NewsletterDigest = {
    id: digestId,
    subject: `${SITE_NAME}: дайджест за ${dateRangeStr}`,
    preheader: `${materials(articles.length)} недели для ветеринарных врачей: ${newsletterArticles[0]?.title ?? ''}`,
    dateRange: { start: weekStart, end: weekEnd },
    articles: newsletterArticles,
    stats: {
      totalArticles: articles.length,
      byCategory,
    },
    html: '',
    plainText: '',
    createdAt: new Date(),
  };

  // Generate HTML and plain text
  digest.html = generateDigestHtml(digest);
  digest.plainText = generateDigestPlainText(digest);

  return digest;
}

function generateDigestPlainText(digest: NewsletterDigest): string {
  const { articles, dateRange, stats } = digest;
  const dateRangeStr = digestDateRange(dateRange.start, dateRange.end);

  let text = `${SITE_NAME} — Еженедельный дайджест\n`;
  text += `${dateRangeStr} • ${stats.totalArticles} публикаций\n\n`;
  text += `${'='.repeat(50)}\n\n`;

  const articlesByCategory: Record<string, NewsletterArticle[]> = {};
  articles.forEach(a => {
    const cat = a.category || 'Другое';
    if (!articlesByCategory[cat]) articlesByCategory[cat] = [];
    articlesByCategory[cat].push(a);
  });

  for (const [category, catArticles] of Object.entries(articlesByCategory)) {
    text += `## ${category}\n\n`;

    for (const article of catArticles) {
      text += `• ${article.title}\n`;
      if (article.excerpt) {
        text += `  ${article.excerpt.substring(0, 100)}...\n`;
      }
      text += `  ${article.url}\n\n`;
    }
  }

  text += `${'='.repeat(50)}\n\n`;
  text += `Все новости: ${SITE_URL}/news\n`;
  text += `Настроить или отключить дайджест: ${SITE_URL}/account?tab=digest\n`;

  return text;
}

export async function saveDigestToDb(digest: NewsletterDigest): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: `newsletter_${digest.id}` },
    create: {
      key: `newsletter_${digest.id}`,
      value: {
        id: digest.id,
        subject: digest.subject,
        articleCount: digest.articles.length,
        dateRange: {
          start: digest.dateRange.start.toISOString(),
          end: digest.dateRange.end.toISOString(),
        },
        createdAt: digest.createdAt.toISOString(),
      },
    },
    update: {
      value: {
        id: digest.id,
        subject: digest.subject,
        articleCount: digest.articles.length,
        dateRange: {
          start: digest.dateRange.start.toISOString(),
          end: digest.dateRange.end.toISOString(),
        },
        createdAt: digest.createdAt.toISOString(),
      },
    },
  });
}

export async function getRecentDigests(limit: number = 10): Promise<Array<{
  id: string;
  subject: string;
  articleCount: number;
  createdAt: string;
}>> {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: { startsWith: 'newsletter_digest-' },
    },
    orderBy: { key: 'desc' },
    take: limit,
  });

  return configs.map((c: { key: string; value: unknown }) => {
    const value = c.value as Record<string, unknown>;
    return {
      id: value.id as string,
      subject: value.subject as string,
      articleCount: value.articleCount as number,
      createdAt: value.createdAt as string,
    };
  });
}
