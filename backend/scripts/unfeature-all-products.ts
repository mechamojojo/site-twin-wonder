/**
 * Remove destaque (featured) de todos os produtos.
 * Uso: cd backend && npx ts-node scripts/unfeature-all-products.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.product.updateMany({
    where: { featured: true },
    data: { featured: false },
  });
  console.log(`${result.count} produto(s) tiveram destaque removido.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
