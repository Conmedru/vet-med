import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import type { JournalIssueApiItem, JournalIssueCreateInput, JournalIssueUpdateInput } from "@/lib/schemas/journal";

const journalIssueSelect = {
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
} satisfies Prisma.JournalIssueSelect;

type JournalIssueRecord = Prisma.JournalIssueGetPayload<{
  select: typeof journalIssueSelect;
}>;

export class JournalServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "JournalServiceError";
  }
}

function toApiIssue(issue: JournalIssueRecord): JournalIssueApiItem {
  return {
    id: issue.id,
    slug: issue.slug,
    title: issue.title,
    issueNumber: issue.issueNumber,
    publicationDate: issue.publicationDate.toISOString(),
    description: issue.description,
    coverImageUrl: issue.coverImageUrl,
    coverAlt: issue.coverAlt,
    landingUrl: issue.landingUrl,
    pdfUrl: issue.pdfUrl,
    isPublished: issue.isPublished,
    isFeatured: issue.isFeatured,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (counter < 100) {
    const existing = await prisma.journalIssue.findFirst({
      where: {
        slug,
        ...(excludeId
          ? {
              id: {
                not: excludeId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

function assertPublishable(coverImageUrl: string, isPublished: boolean): void {
  if (isPublished && !coverImageUrl) {
    throw new JournalServiceError("Cover image is required before publishing issue", 400);
  }
}

export async function listJournalIssuesAdmin(): Promise<JournalIssueApiItem[]> {
  const issues = await prisma.journalIssue.findMany({
    orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
    select: journalIssueSelect,
  });

  return issues.map(toApiIssue);
}

export async function listPublishedJournalIssues(): Promise<JournalIssueApiItem[]> {
  const issues = await prisma.journalIssue.findMany({
    where: { isPublished: true },
    orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
    select: journalIssueSelect,
  });

  return issues.map(toApiIssue);
}

export async function getJournalIssueById(id: string): Promise<JournalIssueApiItem | null> {
  const issue = await prisma.journalIssue.findUnique({
    where: { id },
    select: journalIssueSelect,
  });

  if (!issue) return null;
  return toApiIssue(issue);
}

export async function createJournalIssue(input: JournalIssueCreateInput): Promise<JournalIssueApiItem> {
  const baseSlug = generateSlug(input.slug || input.title);
  const slug = await ensureUniqueSlug(baseSlug);
  const coverImageUrl = input.coverImageUrl || "";

  assertPublishable(coverImageUrl, input.isPublished ?? false);

  const issue = await prisma.journalIssue.create({
    data: {
      slug,
      title: input.title,
      issueNumber: input.issueNumber || null,
      publicationDate: input.publicationDate,
      description: input.description || null,
      coverImageUrl,
      coverAlt: input.coverAlt || null,
      landingUrl: input.landingUrl || null,
      pdfUrl: input.pdfUrl || null,
      isPublished: input.isPublished ?? false,
      isFeatured: input.isFeatured ?? true,
    },
    select: journalIssueSelect,
  });

  return toApiIssue(issue);
}

export async function updateJournalIssue(id: string, input: JournalIssueUpdateInput): Promise<JournalIssueApiItem> {
  const existing = await prisma.journalIssue.findUnique({
    where: { id },
    select: { id: true, slug: true, coverImageUrl: true, isPublished: true },
  });

  if (!existing) {
    throw new JournalServiceError("Journal issue not found", 404);
  }

  let nextSlug = existing.slug;
  if (input.slug || input.title) {
    const baseSlug = generateSlug(input.slug || input.title || existing.slug);
    nextSlug = await ensureUniqueSlug(baseSlug, id);
  }

  const nextCover = input.coverImageUrl !== undefined ? input.coverImageUrl || "" : existing.coverImageUrl;
  const nextPublished = input.isPublished !== undefined ? input.isPublished : existing.isPublished;

  assertPublishable(nextCover, nextPublished);

  const issue = await prisma.journalIssue.update({
    where: { id },
    data: {
      slug: nextSlug,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.issueNumber !== undefined ? { issueNumber: input.issueNumber || null } : {}),
      ...(input.publicationDate !== undefined ? { publicationDate: input.publicationDate } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl || "" } : {}),
      ...(input.coverAlt !== undefined ? { coverAlt: input.coverAlt || null } : {}),
      ...(input.landingUrl !== undefined ? { landingUrl: input.landingUrl || null } : {}),
      ...(input.pdfUrl !== undefined ? { pdfUrl: input.pdfUrl || null } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
    },
    select: journalIssueSelect,
  });

  return toApiIssue(issue);
}

export async function setJournalIssueCover(id: string, coverImageUrl: string): Promise<JournalIssueApiItem> {
  try {
    const issue = await prisma.journalIssue.update({
      where: { id },
      data: {
        coverImageUrl,
      },
      select: journalIssueSelect,
    });

    return toApiIssue(issue);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new JournalServiceError("Journal issue not found", 404);
    }
    throw error;
  }
}

export async function deleteJournalIssue(id: string): Promise<void> {
  try {
    await prisma.journalIssue.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new JournalServiceError("Journal issue not found", 404);
    }
    throw error;
  }
}

export async function getLatestJournalIssueForBanner(): Promise<JournalIssueApiItem | null> {
  try {
    const featured = await prisma.journalIssue.findFirst({
      where: {
        isPublished: true,
        isFeatured: true,
        coverImageUrl: {
          not: "",
        },
      },
      orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
      select: journalIssueSelect,
    });

    if (featured) return toApiIssue(featured);

    const latestPublished = await prisma.journalIssue.findFirst({
      where: {
        isPublished: true,
        coverImageUrl: {
          not: "",
        },
      },
      orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
      select: journalIssueSelect,
    });

    if (!latestPublished) return null;
    return toApiIssue(latestPublished);
  } catch (error) {
    console.error("[Magazine] Failed to get latest journal issue for banner:", error);
    return null;
  }
}
