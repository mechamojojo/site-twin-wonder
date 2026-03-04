-- CreateTable
CREATE TABLE "SavedProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedProduct_userId_productSlug_key" ON "SavedProduct"("userId", "productSlug");

-- CreateIndex
CREATE INDEX "SavedProduct_userId_idx" ON "SavedProduct"("userId");

-- AddForeignKey
ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

