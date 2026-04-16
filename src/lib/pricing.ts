/**
 * Pricing logic shared with backend (`backend/src/pricing.ts`, `/api/price/preview`).
 * Use this whenever we display a product price so listing and product page match.
 *
 * Markup sobre o custo em R$ (após CNY × taxa):
 * - até R$ 1.500: +100%
 * - acima de R$ 1.500 até R$ 3.000: +80%
 * - acima de R$ 3.000: +60%
 */
const RATE_CNY_TO_BRL = 0.81;

function displayMultiplierForCostBrl(costBrl: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0) return 2;
  if (costBrl <= 1500) return 2;
  if (costBrl <= 3000) return 1.8;
  return 1.6;
}

function sellingPriceFromCostBrl(costBrl: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0) return 0;
  const mult = displayMultiplierForCostBrl(costBrl);
  return Math.round(costBrl * mult * 100) / 100;
}

function toFinitePositive(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function toFiniteNonNegative(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Converts price in CNY to final BRL (custo em reais × multiplicador por faixa).
 * Same formula as backend so listing and order page show the same value.
 * Aceita string (ex.: JSON do Prisma Decimal).
 */
export function priceCnyToBrl(
  priceCny: number | string | null | undefined,
): number {
  const n = toFinitePositive(priceCny);
  if (n == null) return 0;
  const costBrl = n * RATE_CNY_TO_BRL;
  return sellingPriceFromCostBrl(costBrl);
}

/**
 * Display price in BRL: use priceCny when available (mesma regra do Explorar), senão priceBrl gravado.
 * Normaliza string/Decimal da API.
 */
export function getDisplayPriceBrl(
  priceCny: unknown,
  priceBrl: unknown,
): number | null {
  const cny = toFinitePositive(priceCny);
  if (cny != null) return priceCnyToBrl(cny);
  const brl = toFiniteNonNegative(priceBrl);
  if (brl != null && brl > 0) return Math.round(brl * 100) / 100;
  return null;
}
