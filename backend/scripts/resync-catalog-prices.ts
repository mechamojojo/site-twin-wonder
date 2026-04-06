/**
 * Recalcula priceBrl de todos os produtos do catálogo a partir de priceCny,
 * usando a mesma fórmula do site (src/lib/pricing.ts e /api/price/preview):
 *   custo em R$ = priceCny × 0.81
 *   preço exibido = custo × 2
 *
 * Uso após mudar taxa/multiplicador ou para corrigir BRL antigo gravado no banco.
 *
 *   cd backend && npm run resync-catalog-prices
 *
 * Não altera priceCny. Para atualizar CNY a partir das lojas, use:
 *   npm run update-explorar-previews   (só produtos featured)
 *   ou reimporte / edite no Admin.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Mesmos valores que em src/lib/pricing.ts e backend/src/index.ts */
const RATE_CNY_TO_BRL = 0.81;
const DISPLAY_PRICE_MULTIPLIER = 2;

function brlFromCny(priceCny: number): number {
  const costBrl = priceCny * RATE_CNY_TO_BRL;
  return Math.round(costBrl * DISPLAY_PRICE_MULTIPLIER * 100) / 100;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Erro: defina DATABASE_URL no .env do backend.");
    process.exit(1);
  }

  const products = await prisma.product.findMany({
    select: { id: true, titlePt: true, title: true, priceCny: true, priceBrl: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const cnyRaw = p.priceCny;
    const cny =
      cnyRaw != null && String(cnyRaw) !== ""
        ? Number(cnyRaw as unknown as string | number)
        : NaN;
    if (!Number.isFinite(cny) || cny <= 0) {
      skipped++;
      continue;
    }

    const nextBrl = brlFromCny(cny);
    const prevBrl =
      p.priceBrl != null && String(p.priceBrl) !== ""
        ? Number(p.priceBrl as unknown as string | number)
        : null;

    if (prevBrl != null && Math.abs(prevBrl - nextBrl) < 0.005) {
      skipped++;
      continue;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: { priceBrl: nextBrl },
    });
    updated++;
    const label = (p.titlePt || p.title || p.id).slice(0, 60);
    console.log(`OK  ${label}  CNY ${cny} → BRL ${nextBrl}`);
  }

  console.log(`\nConcluído: ${updated} atualizados, ${skipped} ignorados (sem CNY ou já alinhados).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
