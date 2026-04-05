/**
 * Pricing logic shared with backend (/api/price/preview).
 * Use this whenever we display a product price so listing and product page match.
 */
const RATE_CNY_TO_BRL = 0.81;
/** Preço ao cliente = custo em R$ (após câmbio) × este fator (2 = dobro do custo). */
const DISPLAY_PRICE_MULTIPLIER = 2;

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
 * Converts price in CNY to final BRL (custo em reais × multiplicador).
 * Same formula as backend so listing and order page show the same value.
 * Aceita string (ex.: JSON do Prisma Decimal).
 */
export function priceCnyToBrl(priceCny: number | string | null | undefined): number {
  const n = toFinitePositive(priceCny);
  if (n == null) return 0;
  const costBrl = n * RATE_CNY_TO_BRL;
  return Math.round(costBrl * DISPLAY_PRICE_MULTIPLIER * 100) / 100;
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
