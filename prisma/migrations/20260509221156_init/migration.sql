-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "preferredVideoFormat" TEXT NOT NULL DEFAULT 'short',
    "preferredAIStyle" TEXT NOT NULL DEFAULT 'Manual',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetadataTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "accountName" TEXT,
    "isDistributionEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlatformPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PostHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoFormat" TEXT NOT NULL DEFAULT 'short',
    "scheduledAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "stagedFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostPlatformResult" (
    "id" TEXT NOT NULL,
    "postHistoryId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountName" TEXT,
    "accountId" TEXT,
    "platformPostId" TEXT,
    "permalink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "resumableUrl" TEXT,
    "videoId" TEXT,
    "creationId" TEXT,
    "lastOffset" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optimizedFileId" TEXT,
    "transcodeStatus" TEXT DEFAULT 'skipped',
    "metadata" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostPlatformResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'High Priority',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "category" TEXT NOT NULL DEFAULT 'Marketing',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "processingStatus" TEXT DEFAULT 'ready',

    CONSTRAINT "GalleryAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "action" TEXT NOT NULL,
    "provider" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MetadataTemplate_userId_idx" ON "MetadataTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPreference_userId_platformId_key" ON "PlatformPreference"("userId", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PostPlatformResult_postHistoryId_platform_accountId_key" ON "PostPlatformResult"("postHistoryId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "RoadmapTask_priority_status_idx" ON "RoadmapTask"("priority", "status");

-- CreateIndex
CREATE INDEX "LaunchTask_category_status_idx" ON "LaunchTask"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAsset_fileId_key" ON "GalleryAsset"("fileId");

-- CreateIndex
CREATE INDEX "GalleryAsset_userId_idx" ON "GalleryAsset"("userId");

-- CreateIndex
CREATE INDEX "GalleryAsset_expiresAt_idx" ON "GalleryAsset"("expiresAt");

-- CreateIndex
CREATE INDEX "TokenAuditLog_userId_idx" ON "TokenAuditLog"("userId");

-- CreateIndex
CREATE INDEX "TokenAuditLog_accountId_idx" ON "TokenAuditLog"("accountId");

-- CreateIndex
CREATE INDEX "TokenAuditLog_action_idx" ON "TokenAuditLog"("action");

-- CreateIndex
CREATE INDEX "TokenAuditLog_createdAt_idx" ON "TokenAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "MetadataTemplate" ADD CONSTRAINT "MetadataTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPreference" ADD CONSTRAINT "PlatformPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHistory" ADD CONSTRAINT "PostHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPlatformResult" ADD CONSTRAINT "PostPlatformResult_postHistoryId_fkey" FOREIGN KEY ("postHistoryId") REFERENCES "PostHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryAsset" ADD CONSTRAINT "GalleryAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAuditLog" ADD CONSTRAINT "TokenAuditLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAuditLog" ADD CONSTRAINT "TokenAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
