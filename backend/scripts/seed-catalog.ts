/**
 * Popula o catálogo com produtos iniciais.
 * Uso: cd backend && npx ts-node scripts/seed-catalog.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SEED_PRODUCTS } from "../prisma/seed-products";

const prisma = new PrismaClient();

async function main() {
  let added = 0;
  for (const p of SEED_PRODUCTS) {
    try {
      await prisma.product.upsert({
        where: { originalUrl: p.originalUrl },
        update: {
          title: p.title,
          titlePt: p.titlePt ?? null,
          image: p.image ?? null,
          priceCny: p.priceCny != null ? p.priceCny : null,
          priceBrl: p.priceBrl != null ? p.priceBrl : null,
          source: p.source,
          category: p.category,
          slug: p.slug,
          featured: p.featured,
          sortOrder: p.sortOrder,
        },
        create: {
          originalUrl: p.originalUrl,
          title: p.title,
          titlePt: p.titlePt ?? null,
          image: p.image ?? null,
          priceCny: p.priceCny != null ? p.priceCny : null,
          priceBrl: p.priceBrl != null ? p.priceBrl : null,
          source: p.source,
          category: p.category,
          slug: p.slug,
          featured: p.featured,
          sortOrder: p.sortOrder,
        },
      });
      added++;
      console.log("+", p.title);
    } catch (e) {
      console.error("Erro:", p.title, e);
    }
  }
  console.log(`\n${added} produtos no catálogo.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
