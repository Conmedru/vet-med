import { generateWeeklyDigest, sendNewArticleNotification } from '../lib/newsletter';
import { unisender } from '../lib/unisender';
import { prisma } from '../lib/prisma';

// Mock console.log to keep output clean but visible
const originalLog = console.log;
console.log = (...args) => originalLog('[TEST]', ...args);

async function main() {
  console.log("=== STARTING NEWSLETTER TEST ===");

  // 1. Test Digest Generation
  console.log("\n--- Testing Digest Generation ---");
  try {
    const digest = await generateWeeklyDigest(0);
    console.log(`Generated digest ID: ${digest.id}`);
    console.log(`Subject: ${digest.subject}`);
    console.log(`Article count: ${digest.articles.length}`);
    console.log(`Date range: ${digest.dateRange.start.toISOString()} - ${digest.dateRange.end.toISOString()}`);
    
    if (digest.articles.length === 0) {
      console.warn("WARNING: No articles found for digest! Did you run fix-article-dates.ts?");
    } else {
      console.log("First article in digest:", digest.articles[0].title);
    }
  } catch (error) {
    console.error("Digest generation failed:", error);
  }

  // 2. Test Subscription Logic (Mock)
  console.log("\n--- Testing Subscription (Unisender Wrapper) ---");
  const testEmail = "test@example.com";
  try {
    // We won't actually call the API if we don't want to spam, but let's check if API key is present
    if (!process.env.UNISENDER) {
      console.warn("Skipping real Unisender call because UNISENDER env var is not set.");
    } else {
      console.log(`Attempting to subscribe ${testEmail} (dry run logic)...`);
      // We can't really "dry run" the API call without mocking the fetch in unisender.ts or actually calling it.
      // Let's just inspect the unisender object methods availability
      if (typeof unisender.subscribe === 'function') {
         console.log("unisender.subscribe function exists.");
      }
    }
  } catch (error) {
    console.error("Subscription test failed:", error);
  }

  // 3. Test New Article Notification Logic
  console.log("\n--- Testing New Article Notification ---");
  try {
    const article = await prisma.article.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' }
    });

    if (article) {
      console.log(`Found article: ${article.title} (${article.id})`);
      // We will NOT actually send it to avoid spamming the list if credentials are real.
      // But we can verify the function builds the HTML correctly if we had separated that logic.
      // For now, let's just confirm we can find the article and ready to send.
      console.log("Ready to trigger notification (skipping actual send to avoid spam to real users).");
    } else {
      console.warn("No published article found.");
    }
  } catch (error) {
    console.error("Notification test failed:", error);
  }

  console.log("\n=== TEST COMPLETE ===");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
