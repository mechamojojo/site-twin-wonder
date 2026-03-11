/**
 * Atualiza imagem e título dos produtos do catálogo via scraper (preview na home).
 * Uso: cd backend && npm run update-explorar-previews
 * Opcional: npm run update-explorar-previews -- --limit=10  (só os primeiros 10)
 * Requer: npx playwright install chromium  (se ainda não instalou)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getProductPreview } from "../src/scraper/productPreview";

const prisma = new PrismaClient();
const RATE_CNY = 0.78;

function getLimit(): number | null {
  const arg = process.argv.find((a) => a === "--limit" || a.startsWith("--limit="));
  if (!arg) return null;
  const value = arg.includes("=") ? arg.split("=")[1] : process.argv[process.argv.indexOf(arg) + 1];
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Erro: DATABASE_URL não definida. Crie um arquivo .env no backend com DATABASE_URL=...");
    process.exit(1);
  }
  const limitArg = getLimit();
  const products = await prisma.product.findMany({
    where: { featured: true },
    orderBy: { sortOrder: "asc" },
    ...(limitArg != null ? { take: limitArg } : {}),
  });
  console.log(`${products.length} produtos a atualizar (preview imagem/título).`);
  console.log("Aguarde: cada produto abre a página no navegador (~5–10 s cada). Pode levar vários minutos.\n");

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const preview = await getProductPreview(p.originalUrl);
      if (!preview) {
        console.warn(`[${i + 1}/${products.length}] Sem preview: ${p.titlePt || p.title}`);
        continue;
      }

      const title = (preview.title || p.title || "Produto").slice(0, 300);
      const titlePt = (preview.titlePt || preview.title || p.titlePt || p.title || "Produto").slice(0, 300);
      const image = preview.images?.[0] ?? p.image;
      const priceCnyVal = preview.priceCny != null ? Number(preview.priceCny) : (p.priceCny != null ? Number(p.priceCny) : null);
      let priceBrlVal: number | null = p.priceBrl != null ? Number(p.priceBrl) : null;
      if (priceCnyVal != null && priceCnyVal > 0) {
        const costBrl = priceCnyVal * RATE_CNY;
        const margin = costBrl < 60 ? 0.5 : 0.35;
        priceBrlVal = Math.round(costBrl * (1 + margin) * 100) / 100;
      }

      await prisma.product.update({
        where: { id: p.id },
        data: {
          title,
          titlePt: titlePt || null,
          image: image || null,
          images: preview.images?.length ? JSON.stringify(preview.images) : p.images,
          priceCny: priceCnyVal,
          priceBrl: priceBrlVal,
        },
      });
      console.log(`[${i + 1}/${products.length}] OK ${titlePt.slice(0, 50)}... ${image ? "imagem" : "sem imagem"}`);
    } catch (e) {
      console.warn(`[${i + 1}/${products.length}] Erro ${p.originalUrl}:`, (e as Error).message);
    }
  }
  console.log("\nConcluído.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
