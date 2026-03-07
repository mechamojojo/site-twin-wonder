/**
 * Exporta os produtos do banco LOCAL para um JSON no frontend.
 * Assim, os nomes (e demais dados) que você editou no Admin ficam no código e vão para produção no deploy.
 *
 * Uso: cd backend && npm run export-explorar-to-code
 * Depois: commitar src/data/explorarProducts.export.json e fazer deploy.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_PATH = path.join(__dirname, "../../src/data/explorarProducts.export.json");

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const exported = products.map((p) => ({
    id: p.id,
    url: p.originalUrl,
    title: p.title,
    titlePt: p.titlePt ?? p.title,
    image: p.image ?? null,
    priceCny: p.priceCny != null ? Number(p.priceCny) : null,
    priceBrl: p.priceBrl != null ? Number(p.priceBrl) : null,
    category: p.category,
    source: p.source,
    slug: p.slug,
  }));

  const dir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(exported, null, 2), "utf-8");
  console.log(`Exportados ${exported.length} produtos para ${OUT_PATH}`);
  console.log("Comite o arquivo e faça deploy para que a produção use essas alterações.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
