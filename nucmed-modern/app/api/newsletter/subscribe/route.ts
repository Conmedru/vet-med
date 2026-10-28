import { NextRequest, NextResponse } from "next/server";
import { unisender, VET_LIST_ID } from "@/lib/unisender";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SubscribeSchema = z.object({
  email: z.string().email(),
  type: z.enum(["digest", "all", "categories"]).optional().default("digest"),
  categories: z.array(z.string()).optional().default([]),
  digestEnabled: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = SubscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { email, type, categories, digestEnabled } = result.data;

    // Upsert subscriber in local DB
    const existing = await prisma.subscriber.findUnique({ where: { email } });

    let subscriber;
    if (existing) {
      // Merge categories (add new ones, keep existing)
      const mergedCategories = [...new Set([...existing.categories, ...categories])];
      subscriber = await prisma.subscriber.update({
        where: { email },
        data: {
          categories: mergedCategories,
          digestEnabled: type === "digest" || type === "all" ? true : digestEnabled,
          status: "active",
          confirmedAt: existing.confirmedAt || new Date(),
        },
      });
    } else {
      subscriber = await prisma.subscriber.create({
        data: {
          email,
          categories,
          digestEnabled: type === "digest" || type === "all",
          status: "active",
          confirmedAt: new Date(),
        },
      });
    }

    // Sync to Unisender for email delivery
    try {
      // Our own list only (shared Unisender account, see lib/unisender.ts)
      await unisender.subscribe(email, VET_LIST_ID, {
        SUBSCRIPTION_TYPE: type,
      });
    } catch (e) {
      console.error("[Subscribe] Unisender sync failed (non-fatal):", e);
    }

    return NextResponse.json({
      success: true,
      status: existing ? "updated" : "subscribed",
      subscriber: {
        categories: subscriber.categories,
        digestEnabled: subscriber.digestEnabled,
        token: subscriber.unsubscribeToken,
      },
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
