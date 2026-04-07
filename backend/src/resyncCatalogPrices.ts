import type { PrismaClient } from "@prisma/client";

/** Mesmos valores que em src/lib/pricing.ts e index.ts (RATE_CNY × 2×) */
const RATE_CNY_TO_BRL = 0.81;
const DISPLAY_PRICE_MULTIPLIER = 2;

function brlFromCny(priceCny: number): number {
  const costBrl = priceCny * RATE_CNY_TO_BRL;
  return Math.round(costBrl * DISPLAY_PRICE_MULTIPLIER * 100) / 100;
}

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
  }

  return { updated, skipped };
}
