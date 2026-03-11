-- CreateTable
CREATE TABLE "ProductPreviewSnapshot" (
    "id" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPreviewSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPreviewSnapshot_urlKey_key" ON "ProductPreviewSnapshot"("urlKey");
