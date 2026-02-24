import { prisma } from "@/lib/prisma";

export interface SponsoredPostFeed {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  targetUrl: string;
  advertiserName: string | null;
  category: string | null;
}

/**
 * Get active sponsored posts for feed integration (server-side)
 */
export async function getActiveSponsoredPosts(): Promise<SponsoredPostFeed[]> {
  try {
    const now = new Date();

    const posts = await prisma.sponsoredPost.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        targetUrl: true,
        advertiserName: true,
        category: true,
      },
    });

    return posts;
  } catch (error) {
    console.error("[Sponsored] Failed to get active posts:", error);
    return [];
  }
}
