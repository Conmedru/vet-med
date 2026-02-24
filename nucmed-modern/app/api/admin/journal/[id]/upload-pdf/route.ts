import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import { JournalServiceError } from "@/lib/magazine";
import { JournalIssueSingleResponseSchema } from "@/lib/schemas/journal";
import { isS3Configured, uploadImage } from "@/lib/storage/s3";
import { prisma } from "@/lib/prisma";

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Invalid file type. Only PDF is allowed" }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let pdfUrl: string;
    if (isS3Configured()) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const key = `journal/${year}/${month}/${id}/issue.pdf`;
      pdfUrl = await uploadImage(buffer, key, "application/pdf");
    } else {
      pdfUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
    }

    const issue = await prisma.journalIssue.update({
      where: { id },
      data: { pdfUrl },
      select: {
        id: true,
        slug: true,
        title: true,
        issueNumber: true,
        publicationDate: true,
        description: true,
        coverImageUrl: true,
        coverAlt: true,
        landingUrl: true,
        pdfUrl: true,
        isPublished: true,
        isFeatured: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const apiIssue = {
      ...issue,
      publicationDate: issue.publicationDate.toISOString(),
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };

    const payload = JournalIssueSingleResponseSchema.parse({ issue: apiIssue });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof JournalServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[Admin Journal] PDF upload error:", error);
    return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
  }
}
