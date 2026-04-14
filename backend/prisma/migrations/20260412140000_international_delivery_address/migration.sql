-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryInBrazil" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "internationalAddressLines" TEXT;
