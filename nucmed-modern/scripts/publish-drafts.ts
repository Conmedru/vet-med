import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run");

    console.log(`[Publish Drafts] Starting script. Dry run: ${isDryRun}`);

    // Find all DRAFT articles with required fields
    const draftsToPublish = await prisma.article.findMany({
        where: {
            status: "DRAFT",
            title: { not: null },
            content: { not: null },
            coverImageUrl: { not: null },
        },
        select: {
            id: true,
            title: true,
            originalPublishedAt: true,
            createdAt: true,
        },
    });

    console.log(`[Publish Drafts] Found ${draftsToPublish.length} valid drafts to publish.`);

    if (draftsToPublish.length === 0) {
        console.log("[Publish Drafts] Nothing to do.");
        return;
    }

    let publishedCount = 0;
    let errorCount = 0;

    for (const article of draftsToPublish) {
        try {
            const publishDate = article.originalPublishedAt || article.createdAt;

            if (!isDryRun) {
                await prisma.article.update({
                    where: { id: article.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt: publishDate,
                    },
                });

                // Log activity
                await prisma.activityLog.create({
                    data: {
                        action: "article.bulk_published",
                        entityType: "article",
                        entityId: article.id,
                        metadata: {
                            actor: "system_script",
                            title: article.title,
                        }
                    }
                });
            }

            console.log(`[${isDryRun ? "DRY-RUN" : "PUBLISHED"}] ${article.title?.slice(0, 50)}... -> Set to ${publishDate.toISOString()}`);
            publishedCount++;
        } catch (error) {
            console.error(`[ERROR] Failed to publish article ${article.id}:`, error);
            errorCount++;
        }
    }

    console.log(`\n[Publish Drafts] Summary:`);
    console.log(`- Total prepared: ${draftsToPublish.length}`);
    console.log(`- Successfully updated: ${publishedCount}`);
    console.log(`- Errors: ${errorCount}`);

    if (isDryRun) {
        console.log(`\nThis was a DRY RUN. Run without --dry-run to commit changes.`);
    } else {
        console.log(`\nNote: Email notifications were EXPLICITLY OMITTED during this bulk run.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
