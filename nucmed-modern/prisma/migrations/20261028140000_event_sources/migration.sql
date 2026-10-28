ALTER TABLE "events"
ADD COLUMN "endDate" TIMESTAMP(3),
ADD COLUMN "location" TEXT,
ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "manualEditedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "events_sourceType_externalId_key" ON "events"("sourceType", "externalId");
