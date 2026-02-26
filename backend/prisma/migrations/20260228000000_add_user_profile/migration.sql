-- AlterTable: add profile fields to User for cadastro (dados de envio)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerCpf" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerWhatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cep" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressStreet" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressComplement" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressNeighborhood" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressCity" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressState" TEXT;
