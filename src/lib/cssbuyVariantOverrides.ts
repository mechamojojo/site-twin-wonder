/**
 * Fallback para variantes da CSSBuy quando o preview ainda vem incompleto (cache / scrape).
 * Item Taobao 899498747944 — módulos RAM, grupo "Color Classification" na CSSBuy.
 * Manter alinhado a `RAM_TAOBAO_899498747944_CLASSIFICATION_VALUES` no backend.
 */
export const CSSBUY_RAM_899498747944_CLASSIFICATION_VALUES = [
  "DDR4-8GB 3600MHz XMP",
  "DDR4-16GB 3600MHz XMP",
  "DDR4-8GB 2666MHz",
  "DDR4-16GB 2666MHz",
  "DDR4-8GB 3200MHz XMP",
  "DDR4-16GB 3200MHz XMP",
  "DDR3-8GB 1600MHz",
] as const;

export function isCssbuyRamModule899498747944Url(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes("cssbuy")) return false;
    const m = u.pathname.match(/item-(?:[a-z0-9]+-)?(\d+)\.html$/i);
    return m?.[1] === "899498747944";
  } catch {
    return false;
  }
}

type PreviewSlice = {
  optionGroups: Array<{
    name: string;
    values: string[];
    images: string[];
    displayAsImages?: boolean;
    priceByValue?: Record<string, number>;
    inventoryByValue?: Record<string, number>;
    inventoryByColorAndValue?: Record<string, Record<string, number>>;
    sourcePriceLabelByValue?: Record<string, string>;
  }>;
  variants: {
    color?: string[];
    size?: string[];
    colorImages?: string[];
  };
};

/** Se houver menos de 7 opções distintas, força a lista oficial (igual CSSBuy). */
export function applyCssbuyRam899498747944PreviewOverride(
  url: string,
  state: PreviewSlice,
): PreviewSlice {
  if (!isCssbuyRamModule899498747944Url(url)) return state;
  const flat = state.optionGroups.flatMap((g) => g.values);
  const distinct = new Set(flat.map((v) => String(v).trim())).size;
  if (distinct >= 7) return state;

  const values = [...CSSBUY_RAM_899498747944_CLASSIFICATION_VALUES];
  return {
    ...state,
    optionGroups: [
      {
        name: "Color Classification",
        values,
        images: values.map(() => ""),
        displayAsImages: false,
      },
    ],
    variants: {
      ...state.variants,
      color: values,
      colorImages: values.map(() => ""),
    },
  };
}
