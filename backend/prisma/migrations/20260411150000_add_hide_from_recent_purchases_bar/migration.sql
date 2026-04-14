-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "hideFromRecentPurchasesBar" BOOLEAN NOT NULL DEFAULT false;
