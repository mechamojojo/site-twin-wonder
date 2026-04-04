-- CreateTable
CREATE TABLE "RecentStripTitleOverride" (
    "id" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecentStripTitleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecentStripTitleOverride_urlKey_key" ON "RecentStripTitleOverride"("urlKey");
