/**
 * Newsletter Service
 * Generates weekly digest emails with top articles
 */

import { prisma } from '@/lib/prisma';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { unisender } from '@/lib/unisender';
import { generateDigestHtml, generateNotificationHtml } from './templates';

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

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://vetmed.ru';
const SITE_NAME = 'VetMed';

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

  let listId = process.env.UNISENDER_LIST_ID;
  if (!listId) {
    // Try to fetch default list
    try {
      const lists = await unisender.getLists();
      if (lists.result && lists.result.length > 0) {
        listId = lists.result[0].id;
        console.log(`[Newsletter] Using default list ID: ${listId}`);
      }
    } catch (e) {
      console.error("Failed to fetch Unisender lists:", e);
    }
  }

  if (!listId) {
    console.warn("UNISENDER_LIST_ID not set and no lists found, skipping notification");
    return;
  }

  const articleUrl = `${SITE_URL}/news/${article.slug || article.id}`;
  const imageUrl = article.coverImageUrl || article.images[0]?.storedUrl || article.images[0]?.originalUrl;

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
  let listId = process.env.UNISENDER_LIST_ID;
  if (!listId) {
    // Try to fetch default list
    try {
      const lists = await unisender.getLists();
      if (lists.result && lists.result.length > 0) {
        listId = lists.result[0].id;
        console.log(`[Newsletter] Using default list ID: ${listId}`);
      }
    } catch (e) {
      console.error("Failed to fetch Unisender lists:", e);
    }
  }

  if (!listId) {
    console.warn("UNISENDER_LIST_ID not set, skipping digest sending");
    return;
  }

  if (digest.articles.length === 0) {
    console.log("No articles in digest, skipping send");
    return;
  }

  console.log(`Sending weekly digest ${digest.id}...`);
  const result = await unisender.createCampaign(
    digest.subject,
    digest.html,
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
        content: digest.html,
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

export async function getSubscribersForCategory(category: string): Promise<string[]> {
  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "active",
      categories: { has: category },
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

  // Find subscribers for this category
  const emails = await getSubscribersForCategory(article.category);
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

  // Fetch top articles from the week
  const articles = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    orderBy: [
      { publishedAt: 'desc' },
    ],
    take: 15,
    include: {
      images: {
        where: { isCover: true },
        take: 1,
      },
    },
  });

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
    url: `${SITE_URL}/news/${a.id}`,
    imageUrl: a.coverImageUrl || a.images[0]?.storedUrl || a.images[0]?.originalUrl || null,
  }));

  const dateRangeStr = `${format(weekStart, 'd MMMM', { locale: ru })} - ${format(weekEnd, 'd MMMM yyyy', { locale: ru })}`;

  const digest: NewsletterDigest = {
    id: `digest-${format(weekStart, 'yyyy-MM-dd')}`,
    subject: `${SITE_NAME}: Дайджест за ${dateRangeStr}`,
    preheader: `${articles.length} новостей ветеринарной медицины за прошедшую неделю`,
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
  const dateRangeStr = `${format(dateRange.start, 'd MMMM', { locale: ru })} - ${format(dateRange.end, 'd MMMM yyyy', { locale: ru })}`;

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
  text += `Отписаться: ${SITE_URL}/unsubscribe\n`;

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
