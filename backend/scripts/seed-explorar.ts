/**
 * Popula o catálogo com os produtos do Explorar (featured na home).
 * Uso: cd backend && npx ts-node scripts/seed-explorar.ts
 * Opcional: npx ts-node scripts/seed-explorar.ts --scrape  (busca título/imagem via scraper; mais lento)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { EXPLORAR_PRODUCTS } from "../prisma/seed-explorar-products";

const prisma = new PrismaClient();

const RATE_CNY = 0.81;
const DISPLAY_PRICE_MULTIPLIER = 2;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80) || "produto";
}

async function main() {
  const useScraper = process.argv.includes("--scrape");
  const getProductPreview = useScraper
    ? (await import("../src/scraper/productPreview")).getProductPreview
    : null;

  let sortOrder = 0;
  for (const p of EXPLORAR_PRODUCTS) {
    let title = p.titlePt;
    let titlePt = p.titlePt;
    let image: string | null = null;
    let priceCny = p.priceCny ?? null;

    if (getProductPreview) {
      try {
        const preview = await getProductPreview(p.url);
        if (preview) {
          if (preview.title) title = preview.title.slice(0, 300);
          if (preview.titlePt) titlePt = preview.titlePt.slice(0, 300);
          if (preview.images?.[0]) image = preview.images[0];
          if (preview.priceCny != null) priceCny = preview.priceCny;
        }
      } catch (e) {
        console.warn("Scrape falhou para", p.url, (e as Error).message);
      }
    }

    let priceBrl: number | null = null;
    if (priceCny != null && priceCny > 0) {
      const costBrl = priceCny * RATE_CNY;
      priceBrl = Math.round(costBrl * DISPLAY_PRICE_MULTIPLIER * 100) / 100;
    }

    const existing = await prisma.product.findUnique({ where: { originalUrl: p.url } });
    let slug = existing?.slug ?? slugify(titlePt);
    if (!existing) {
      let n = 0;
      const baseSlug = slug;
      while (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${++n}`;
      }
    }

    await prisma.product.upsert({
      where: { originalUrl: p.url },
      update: {
        title: title ?? "Produto",
        titlePt: titlePt ?? null,
        image,
        priceCny: priceCny,
        priceBrl: priceBrl,
        category: p.category,
        slug,
        featured: true,
        sortOrder: sortOrder++,
        source: "Weidian",
      },
      create: {
        originalUrl: p.url,
        title: title ?? "Produto",
        titlePt: titlePt ?? null,
        image,
        priceCny: priceCny,
        priceBrl: priceBrl,
        category: p.category,
        slug,
        featured: true,
        sortOrder: sortOrder++,
        source: "Weidian",
      },
    });
    console.log("+", titlePt);
  }
  console.log(`\n${EXPLORAR_PRODUCTS.length} produtos em destaque no Explorar.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
