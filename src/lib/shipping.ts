/**
 * shipping.ts — shared freight logic for ComprasChina
 *
 * Weight defaults by product category (grams)
 * Volumetric logic mirrors FJ-BR-EXP rules (LxWxH / 6000)
 * Freight tiers: China + domestic Brazil
 * keepBox surcharge per item
 */

// ---------------------------------------------------------------------------
// Category → default weight (grams)
// ---------------------------------------------------------------------------
export type ProductCategory =
  | "shoes"
  | "coat"
  | "jacket"
  | "bag"
  | "backpack"
  | "electronics"
  | "clothing"
  | "accessory"
  | "other";

const WEIGHT_BY_CATEGORY: Record<ProductCategory, number> = {
  shoes: 900,
  coat: 850,
  jacket: 700,
  bag: 600,
  backpack: 1000, // mochilas ~1 kg for shipping estimate
  electronics: 500,
  clothing: 350,
  accessory: 200,
  other: 400,
};

// keepBox adds volume weight equivalent (shoe-box ≈ +400g, others ≈ +250g)
const KEEPBOX_EXTRA_G: Record<ProductCategory, number> = {
  shoes: 400,
  coat: 250,
  jacket: 250,
  bag: 250,
  backpack: 250,
  electronics: 200,
  clothing: 200,
  accessory: 150,
  other: 200,
};

// ---------------------------------------------------------------------------
// Category detection from title / explicit category field
// ---------------------------------------------------------------------------
const SHOE_RE = /t[eê]nis|sapatilha|bota|sandália|sandalia|sapato|shoe|sneaker|calçado|calcado/i;
const COAT_RE = /casaco|abrigo|overcoat|trench|parka/i;
const JACKET_RE = /jaqueta|moletom|blusa de frio|jaquetão|jacket|hoodie/i;
const BAG_RE = /bolsa|carteira|bag|purse|clutch/i;
const BACKPACK_RE = /mochila|backpack|背包|双肩包/i;
const ELEC_RE = /fone|headphone|earphone|teclado|mouse|notebook|celular|tablet|câmera|camera|eletr/i;
const CLOTH_RE = /camiseta|camisa|calça|shorts|vestido|saia|blusa|polo|top|legging|dress|shirt|pants/i;
const ACCESS_RE = /cinto|óculos|óculos|colar|brinco|relógio|pulseira|chapéu|gorro|cachecol|luva|meia|belt|glasses|necklace|watch|bracelet|hat|scarf|glove|sock/i;

export function detectCategory(title?: string | null, explicitCategory?: string | null): ProductCategory {
  if (explicitCategory) {
    const c = explicitCategory.toLowerCase();
    if (c === "shoes" || c === "calçados") return "shoes";
    if (c === "coat") return "coat";
    if (c === "jacket") return "jacket";
    if (c === "bag" || c === "bags") return "bag";
    if (c === "backpack" || c === "mochila" || c === "mochilas") return "backpack";
    if (c === "electronics") return "electronics";
    if (c === "clothing" || c === "roupas") return "clothing";
    if (c === "accessory" || c === "accessories" || c === "acessórios") return "accessory";
  }
  if (!title) return "other";
  if (SHOE_RE.test(title)) return "shoes";
  if (COAT_RE.test(title)) return "coat";
  if (JACKET_RE.test(title)) return "jacket";
  if (BACKPACK_RE.test(title)) return "backpack";
  if (BAG_RE.test(title)) return "bag";
  if (ELEC_RE.test(title)) return "electronics";
  if (CLOTH_RE.test(title)) return "clothing";
  if (ACCESS_RE.test(title)) return "accessory";
  return "other";
}

/** Returns true for categories where keepBox is relevant (bulky original boxes) */
export function categorySupportsKeepBox(cat: ProductCategory): boolean {
  return cat === "shoes" || cat === "coat" || cat === "jacket" || cat === "bag" || cat === "backpack";
}

// ---------------------------------------------------------------------------
// Weight helpers
// ---------------------------------------------------------------------------
export function itemWeightG(
  category: ProductCategory,
  overrideWeightG?: number | null,
  keepBox = false,
): number {
  const base = overrideWeightG ?? WEIGHT_BY_CATEGORY[category];
  return keepBox ? base + KEEPBOX_EXTRA_G[category] : base;
}

// ---------------------------------------------------------------------------
// FJ-BR-EXP freight tiers (China → Brazil, CNY/kg)
// Source: FJ Freight official rate card (approximate, for estimate only)
// ---------------------------------------------------------------------------
type FreightTier = { maxKg: number; rateCnyPerKg: number };

const FJ_BR_EXP_TIERS: FreightTier[] = [
  { maxKg: 0.5, rateCnyPerKg: 130 },
  { maxKg: 1,   rateCnyPerKg: 110 },
  { maxKg: 2,   rateCnyPerKg: 95  },
  { maxKg: 5,   rateCnyPerKg: 85  },
  { maxKg: 10,  rateCnyPerKg: 75  },
  { maxKg: 20,  rateCnyPerKg: 68  },
  { maxKg: Infinity, rateCnyPerKg: 62 },
];

/** China → Brazil freight in CNY for a given weight in grams */
export function chinaFreightCny(totalWeightG: number): number {
  const kg = totalWeightG / 1000;
  const tier = FJ_BR_EXP_TIERS.find((t) => kg <= t.maxKg)!;
  return kg * tier.rateCnyPerKg;
}

// ---------------------------------------------------------------------------
// Domestic Brazil delivery (Correios / last mile estimate, BRL)
// Simple flat + weight slab
// ---------------------------------------------------------------------------
export function domesticFreightBrl(totalWeightG: number): number {
  const kg = totalWeightG / 1000;
  if (kg <= 0.3) return 18;
  if (kg <= 1)   return 22;
  if (kg <= 3)   return 30;
  if (kg <= 7)   return 40;
  return 55;
}

// ---------------------------------------------------------------------------
// Exchange rate (CNY → BRL) — kept as a constant; update periodically
// ---------------------------------------------------------------------------
export const CNY_TO_BRL = 0.81; // approximate mid-market rate

// ---------------------------------------------------------------------------
// Main cart shipping calculator
// ---------------------------------------------------------------------------
export type CartShippingItem = {
  category: ProductCategory;
  weightG?: number | null;
  keepBox?: boolean;
  quantity: number;
};

export type CartShippingResult = {
  totalWeightG: number;
  chinaFreightCny: number;
  chinaFreightBrl: number;
  domesticBrl: number;
  keepBoxSurchargeBrl: number;
  totalBrl: number;
};

export function calcCartShipping(items: CartShippingItem[]): CartShippingResult {
  let totalWeightG = 0;
  let keepBoxExtra = 0;

  for (const item of items) {
    const cat = item.category ?? "other";
    const perUnitG = itemWeightG(cat, item.weightG, item.keepBox);
    totalWeightG += perUnitG * item.quantity;
    if (item.keepBox) {
      keepBoxExtra += KEEPBOX_EXTRA_G[cat] * item.quantity;
    }
  }

  const cFreightCny = chinaFreightCny(totalWeightG);
  const cFreightBrl = cFreightCny * CNY_TO_BRL;
  const dBrl = domesticFreightBrl(totalWeightG);
  const keepBoxSurchargeBrl = keepBoxExtra * 0.001 * CNY_TO_BRL * 95; // volumetric surcharge

  return {
    totalWeightG,
    chinaFreightCny: Math.round(cFreightCny * 100) / 100,
    chinaFreightBrl: Math.round(cFreightBrl * 100) / 100,
    domesticBrl: Math.round(dBrl * 100) / 100,
    keepBoxSurchargeBrl: Math.round(keepBoxSurchargeBrl * 100) / 100,
    totalBrl: Math.round((cFreightBrl + dBrl + keepBoxSurchargeBrl) * 100) / 100,
  };
}
