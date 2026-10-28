-- CreateTable
CREATE TABLE "member_devices" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_devices_tokenHash_key" ON "member_devices"("tokenHash");

-- CreateIndex
CREATE INDEX "member_devices_memberId_idx" ON "member_devices"("memberId");

-- AddForeignKey
ALTER TABLE "member_devices" ADD CONSTRAINT "member_devices_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

