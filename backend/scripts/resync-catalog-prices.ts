/**
 * Recalcula priceBrl no catálogo (CLI local). Produção: Admin → Sincronizar preços BRL.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { resyncCatalogPrices } from "../src/resyncCatalogPrices";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Erro: defina DATABASE_URL no .env do backend.");
    process.exit(1);
  }

  const { updated, skipped } = await resyncCatalogPrices(prisma);
  console.log(`\nConcluído: ${updated} atualizados, ${skipped} ignorados.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
