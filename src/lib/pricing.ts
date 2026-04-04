/**
 * Pricing logic shared with backend (/api/price/preview).
 * Use this whenever we display a product price so listing and product page match.
 */
const RATE_CNY_TO_BRL = 0.81;
/** Preço ao cliente = custo em R$ (após câmbio) × este fator (2 = dobro do custo). */
const DISPLAY_PRICE_MULTIPLIER = 2;

/**
 * Converts price in CNY to final BRL (custo em reais × multiplicador).
 * Same formula as backend so listing and order page show the same value.
 */
export function priceCnyToBrl(priceCny: number): number {
  const costBrl = priceCny * RATE_CNY_TO_BRL;
  return Math.round(costBrl * DISPLAY_PRICE_MULTIPLIER * 100) / 100;
}

/**
 * Display price in BRL: use priceCny when available (same as order page), else fallback to stored priceBrl.
 */
export function getDisplayPriceBrl(priceCny: number | null | undefined, priceBrl: number | null | undefined): number | null {
  if (priceCny != null && priceCny > 0) return priceCnyToBrl(priceCny);
  if (priceBrl != null) return priceBrl;
  return null;
}
