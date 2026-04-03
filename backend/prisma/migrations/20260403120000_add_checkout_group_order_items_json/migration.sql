-- AlterTable
ALTER TABLE "Order" ADD COLUMN "checkoutGroupId" TEXT;
ALTER TABLE "Order" ADD COLUMN "orderItemsJson" JSONB;

CREATE INDEX "Order_checkoutGroupId_idx" ON "Order"("checkoutGroupId");
