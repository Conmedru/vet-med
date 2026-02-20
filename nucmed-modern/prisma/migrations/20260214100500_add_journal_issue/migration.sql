-- CreateTable
CREATE TABLE "journal_issues" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issueNumber" TEXT,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT NOT NULL,
    "coverAlt" TEXT,
    "landingUrl" TEXT,
    "pdfUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_issues_slug_key" ON "journal_issues"("slug");

-- CreateIndex
CREATE INDEX "journal_issues_isPublished_publicationDate_idx" ON "journal_issues"("isPublished", "publicationDate");

-- CreateIndex
CREATE INDEX "journal_issues_isFeatured_publicationDate_idx" ON "journal_issues"("isFeatured", "publicationDate");
