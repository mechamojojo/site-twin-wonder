import type { PrismaClient } from "@prisma/client";
import { priceCnyToSellingBrl } from "./pricing";

/** Mesma regra que `src/lib/pricing.ts` e importações de produto em `index.ts`. */
export type ResyncCatalogPricesResult = {
  updated: number;
  skipped: number;
};

/**
 * Recalcula priceBrl a partir de priceCny para todo o catálogo.
 * Usado pelo script CLI e por POST /api/admin/catalog/resync-prices (Railway).
 */
export async function resyncCatalogPrices(
  prisma: PrismaClient,
): Promise<ResyncCatalogPricesResult> {
  const products = await prisma.product.findMany({
    select: { id: true, priceCny: true, priceBrl: true },
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

    const nextBrl = priceCnyToSellingBrl(cny);
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
  }

  return { updated, skipped };
}
