/**
 * Embed all published articles for vector search
 * Run: npx tsx scripts/embed-articles.ts
 */

import "dotenv/config"; // Must be first

import { PrismaClient } from "@prisma/client";
import { embedMissingArticles } from "../lib/ai/embeddings";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Starting article embedding process...");
  
  try {
    // Check Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.log("⚠️  REPLICATE_API_TOKEN not found in environment");
      console.log("   Vector search will be disabled");
      console.log("   Add REPLICATE_API_TOKEN to .env to enable embeddings");
      return;
    }

    // Get count of published articles
    const publishedCount = await prisma.article.count({
      where: { status: "PUBLISHED" },
    });

    console.log(`📊 Found ${publishedCount} published articles`);

    // Embed articles without embeddings
    const result = await embedMissingArticles();
    
    console.log("\n✅ Embedding completed:");
    console.log(`   Successfully embedded: ${result.success}`);
    console.log(`   Failed: ${result.failed}`);

    if (result.success > 0) {
      console.log("\n🎉 Vector search is now ready!");
      console.log("   Try searching at: http://localhost:3000/search");
    }

  } catch (error) {
    console.error("❌ Embedding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
