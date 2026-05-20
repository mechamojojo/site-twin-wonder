/**
 * Preços por variante a partir da lista de SKUs (API 1688/CSSBuy).
 */
import type { OptionGroup } from "./productPreview";

export type PropKeyEntry = { groupName: string; value: string };

export function parseSkuPriceCny(sku: Record<string, unknown>): number | null {
  for (const key of [
    "price",
    "salePrice",
    "item_price",
    "priceMoney",
    "orginal_price",
  ]) {
    const raw = sku[key];
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseFloat(raw)
          : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Chave estável para combinação de opções: "Grupo=valor|Grupo2=valor2" (ordenada). */
export function buildSelectionKey(
  parts: { groupName: string; value: string }[],
): string {
  return parts
    .map((p) => `${p.groupName}=${p.value}`)
    .sort()
    .join("|");
}

export function mergeSkuPricesIntoOptionGroups(
  optionGroups: OptionGroup[],
  skuList: Array<Record<string, unknown>>,
  propKeyToGroupAndValue: Record<string, PropKeyEntry>,
): void {
  if (!skuList.length || !Object.keys(propKeyToGroupAndValue).length) return;

  const priceByGroup: Record<string, Record<string, number>> = {};

  for (const sku of skuList) {
    const price = parseSkuPriceCny(sku);
    if (price == null) continue;
    const propsStr = String(sku.properties ?? sku.prop ?? "").trim();
    if (!propsStr) continue;
    const parts = propsStr
      .split(/[;，,]/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      const entry = propKeyToGroupAndValue[part];
      if (!entry) continue;
      if (!priceByGroup[entry.groupName])
        priceByGroup[entry.groupName] = {};
      if (!(entry.value in priceByGroup[entry.groupName]))
        priceByGroup[entry.groupName][entry.value] = price;
    }
  }

  for (const g of optionGroups) {
    const byValue: Record<string, number> = { ...(g.priceByValue ?? {}) };
    for (const vals of Object.values(priceByGroup)) {
      for (const [val, price] of Object.entries(vals)) {
        if (g.values.includes(val)) byValue[val] = price;
      }
    }
    if (Object.keys(byValue).length > 0) g.priceByValue = byValue;
  }
}

export function buildSelectionPriceByKey(
  skuList: Array<Record<string, unknown>>,
  propKeyToGroupAndValue: Record<string, PropKeyEntry>,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!skuList.length || !Object.keys(propKeyToGroupAndValue).length)
    return out;

  for (const sku of skuList) {
    const price = parseSkuPriceCny(sku);
    if (price == null) continue;
    const propsStr = String(sku.properties ?? sku.prop ?? "").trim();
    if (!propsStr) continue;
    const parts: { groupName: string; value: string }[] = [];
    for (const part of propsStr
      .split(/[;，,]/)
      .map((p) => p.trim())
      .filter(Boolean)) {
      const entry = propKeyToGroupAndValue[part];
      if (entry) parts.push(entry);
    }
    if (parts.length === 0) continue;
    const key = buildSelectionKey(parts);
    out[key] = price;
  }
  return out;
}

export function rekeyPriceMapsByTranslation(
  valueToPt: Record<string, string>,
  maps: {
    priceByValue?: Record<string, number>;
    selectionPriceByKey?: Record<string, number>;
  },
): {
  priceByValue?: Record<string, number>;
  selectionPriceByKey?: Record<string, number>;
} {
  const rekeyValues = (src: Record<string, number>) => {
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(src)) {
      next[valueToPt[k.trim()] || k] = v;
    }
    return next;
  };

  const rekeySelection = (src: Record<string, number>) => {
    const next: Record<string, number> = {};
    for (const [key, price] of Object.entries(src)) {
      const newKey = key
        .split("|")
        .map((segment) => {
          const eq = segment.indexOf("=");
          if (eq < 0) return segment;
          const gn = segment.slice(0, eq);
          const val = segment.slice(eq + 1);
          return `${gn}=${valueToPt[val.trim()] || val}`;
        })
        .sort()
        .join("|");
      next[newKey] = price;
    }
    return next;
  };

  return {
    priceByValue: maps.priceByValue
      ? rekeyValues(maps.priceByValue)
      : undefined,
    selectionPriceByKey: maps.selectionPriceByKey
      ? rekeySelection(maps.selectionPriceByKey)
      : undefined,
  };
}
