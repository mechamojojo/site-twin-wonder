/**
 * Preço ao cliente a partir do custo em R$ (CNY × taxa de câmbio).
 * Manter em sincronia com `src/lib/pricing.ts` (frontend).
 *
 * Markup sobre o custo (valor convertido yuan → real):
 * - até R$ 1.500: +100% → ×2
 * - acima de R$ 1.500 até R$ 3.000: +80% → ×1,8
 * - acima de R$ 3.000: +60% → ×1,6
 */
export const RATE_CNY_TO_BRL = 0.81;

/** Multiplicador sobre o custo em R$ para o preço final. */
export function displayMultiplierForCostBrl(costBrl: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0) return 2;
  if (costBrl <= 1500) return 2;
  if (costBrl <= 3000) return 1.8;
  return 1.6;
}

/** Preço de venda em R$ a partir do custo em R$ (após câmbio). */
export function sellingPriceFromCostBrl(costBrl: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0) return 0;
  const mult = displayMultiplierForCostBrl(costBrl);
  return Math.round(costBrl * mult * 100) / 100;
}

/** CNY → preço final BRL (custo × taxa → faixa → markup). */
export function priceCnyToSellingBrl(priceCny: number): number {
  const costBrl = priceCny * RATE_CNY_TO_BRL;
  return sellingPriceFromCostBrl(costBrl);
}
