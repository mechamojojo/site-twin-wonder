/**
 * Peso por unidade (gramas) para URLs específicas (ex.: 1688) quando o padrão
 * por categoria fica incorreto. Chave = offerId numérico do 1688.
 */
const WEIGHT_G_BY_1688_OFFER_ID: Record<string, number> = {
  "927500085524": 150,
  /** https://detail.1688.com/offer/752172662690.html */
  "752172662690": 50,
  /** https://www.cssbuy.com/item-1688-923982155016.html — 200 kg por unidade (pedido / frete) */
  "923982155016": 200_000,
};

function extract1688OfferId(url: string): string | null {
  const offer = url.match(/detail\.1688\.com\/offer\/(\d+)/i);
  if (offer) return offer[1];
  const cssbuy = url.match(/item-1688-(\d+)/i);
  if (cssbuy) return cssbuy[1];
  return null;
}

/** Retorna gramas por unidade se houver override para esta URL; senão `undefined`. */
export function getProductWeightOverrideG(
  url: string | null | undefined,
): number | undefined {
  if (!url || typeof url !== "string") return undefined;
  const id = extract1688OfferId(url.trim());
  if (!id) return undefined;
  const g = WEIGHT_G_BY_1688_OFFER_ID[id];
  return typeof g === "number" && g > 0 ? g : undefined;
}
