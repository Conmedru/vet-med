-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "MemberTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "isGated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "specialtyOther" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rubrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "consentHealthcare" BOOLEAN NOT NULL DEFAULT false,
    "consentPd152" BOOLEAN NOT NULL DEFAULT false,
    "consentPd156" BOOLEAN NOT NULL DEFAULT false,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "consentedAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_sessions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_tokens" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "MemberTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- CreateIndex
CREATE INDEX "members_createdAt_idx" ON "members"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "member_sessions_tokenHash_key" ON "member_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "member_sessions_memberId_idx" ON "member_sessions"("memberId");

-- CreateIndex
CREATE INDEX "member_sessions_expiresAt_idx" ON "member_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "member_tokens_tokenHash_key" ON "member_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "member_tokens_memberId_type_idx" ON "member_tokens"("memberId", "type");

-- CreateIndex
CREATE INDEX "member_tokens_expiresAt_idx" ON "member_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_tokens" ADD CONSTRAINT "member_tokens_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

