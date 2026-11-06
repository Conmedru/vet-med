import { NextRequest, NextResponse } from "next/server";
import { unisender, VET_LIST_ID } from "@/lib/unisender";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
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

    // A known address is never re-subscribed from this open form: anyone could put back on the
    // list a person who unsubscribed. Settings are changed by the link in a letter or in the account.
    const [existing, member] = await Promise.all([
      prisma.subscriber.findUnique({ where: { email } }),
      prisma.member.findUnique({ where: { email }, select: { digestEnabled: true } }),
    ]);
    if (member) {
      return NextResponse.json({
        success: true,
        status: member.digestEnabled ? "already_subscribed" : "member",
        message: member.digestEnabled
          ? "Вы уже подписаны"
          : "Этот email зарегистрирован — включите дайджест в личном кабинете",
      });
    }
    if (existing) {
      return NextResponse.json({
        success: true,
        status: existing.status === "active" && existing.digestEnabled ? "already_subscribed" : "known",
        message:
          existing.status === "active" && existing.digestEnabled
            ? "Вы уже подписаны"
            : "Этот email уже есть в базе — настройки рассылки по ссылке из любого нашего письма",
      });
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        email,
        categories,
        digestEnabled: type === "digest" || type === "all" ? true : digestEnabled,
        status: "active",
        confirmedAt: new Date(),
      },
    });

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
      status: "subscribed",
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
