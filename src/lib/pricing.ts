/**
 * Pricing logic shared with backend (/api/price/preview).
 * Use this whenever we display a product price so listing and product page match.
 */
const RATE_CNY_TO_BRL = 0.78;
const MARGEM_THRESHOLD_BRL = 60;
const MARGEM_BAIXA_PERCENT = 50;  // produto < R$ 60: +50%
const MARGEM_ALTA_PERCENT = 35;   // produto >= R$ 60: +35%

/**
 * Converts price in CNY to final BRL (cost × rate × (1 + margin)).
 * Same formula as backend so listing and order page show the same value.
 */
export function priceCnyToBrl(priceCny: number): number {
  const costBrl = priceCny * RATE_CNY_TO_BRL;
  const marginPercent = costBrl < MARGEM_THRESHOLD_BRL ? MARGEM_BAIXA_PERCENT : MARGEM_ALTA_PERCENT;
  return Math.round(costBrl * (1 + marginPercent / 100) * 100) / 100;
}

/**
 * Display price in BRL: use priceCny when available (same as order page), else fallback to stored priceBrl.
 */
export function getDisplayPriceBrl(priceCny: number | null | undefined, priceBrl: number | null | undefined): number | null {
  if (priceCny != null && priceCny > 0) return priceCnyToBrl(priceCny);
  if (priceBrl != null) return priceBrl;
  return null;
}
