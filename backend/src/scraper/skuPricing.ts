/**
 * Preços por variante a partir da lista de SKUs (API 1688/CSSBuy).
 */
import type { OptionGroup } from "./productPreview";

export type PropKeyEntry = { groupName: string; value: string };

const SIZE_GROUP_NAME_RE =
  /tamanho|size|尺码|尺寸|鞋码|规格|内长|脚长|选择尺码|尺码选择/i;

function displayValueFromPropsListEntry(
  raw: string | { value?: string; value1?: string },
): string {
  if (typeof raw === "string") {
    const colonIdx = raw.indexOf(":");
    return colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw.trim();
  }
  const s = String(raw.value ?? raw.value1 ?? "").trim();
  const colonIdx = s.indexOf(":");
  return colonIdx >= 0 ? s.slice(colonIdx + 1).trim() : s;
}

/** 1688: preço às vezes vem em centavos (ex.: 2640 = ¥26.40). */
export function parseSkuPriceCny(sku: Record<string, unknown>): number | null {
  let raw: number | null = null;
  for (const key of [
    "price",
    "salePrice",
    "item_price",
    "priceMoney",
    "orginal_price",
  ]) {
    const v = sku[key];
    const n =
      typeof v === "number"
        ? v
        : typeof v === "string"
          ? parseFloat(v)
          : NaN;
    if (Number.isFinite(n) && n > 0) {
      raw = n;
      break;
    }
  }
  if (raw == null) return null;
  if (raw >= 500 && raw === Math.floor(raw)) return raw / 100;
  return raw;
}

export function buildSelectionKey(
  parts: { groupName: string; value: string }[],
): string {
  return parts
    .map((p) => `${p.groupName}=${p.value}`)
    .sort()
    .join("|");
}

/** Completa mapa propKey → grupo/valor a partir de props_list e dos grupos finais. */
export function enrichPropKeyMapFromPropsList(
  propsList: Record<string, unknown> | null | undefined,
  optionGroups: OptionGroup[],
  base: Record<string, PropKeyEntry>,
): Record<string, PropKeyEntry> {
  const out = { ...base };
  if (!propsList || typeof propsList !== "object") return out;

  const valueToGroup = new Map<string, string>();
  for (const g of optionGroups) {
    for (const v of g.values) {
      const t = v?.trim();
      if (t) valueToGroup.set(t, g.name);
    }
  }

  for (const [propKey, raw] of Object.entries(propsList)) {
    if (out[propKey]) continue;
    const val = displayValueFromPropsListEntry(
      raw as string | { value?: string; value1?: string },
    );
    if (!val || val.length > 80) continue;
    const groupName = valueToGroup.get(val);
    if (groupName) out[propKey] = { groupName, value: val };
  }
  return out;
}

/** Alinha nomes de grupo ao optionGroups final (após split/rename). */
export function alignPropKeyToFinalGroups(
  propKeyToGroupAndValue: Record<string, PropKeyEntry>,
  optionGroups: OptionGroup[],
): Record<string, PropKeyEntry> {
  const valueToGroup = new Map<string, string>();
  for (const g of optionGroups) {
    for (const v of g.values) {
      const t = v?.trim();
      if (t) valueToGroup.set(t, g.name);
    }
  }
  const out: Record<string, PropKeyEntry> = {};
  for (const [key, entry] of Object.entries(propKeyToGroupAndValue)) {
    const val = entry.value.trim();
    const gn = valueToGroup.get(val) ?? entry.groupName;
    out[key] = { groupName: gn, value: val };
  }
  return out;
}

export function mergeSkuPricesIntoOptionGroups(
  optionGroups: OptionGroup[],
  skuList: Array<Record<string, unknown>>,
  propKeyToGroupAndValue: Record<string, PropKeyEntry>,
): void {
  if (!skuList.length || !Object.keys(propKeyToGroupAndValue).length) return;

  const aligned = alignPropKeyToFinalGroups(propKeyToGroupAndValue, optionGroups);
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
      const entry = aligned[part];
      if (!entry) continue;
      if (!priceByGroup[entry.groupName])
        priceByGroup[entry.groupName] = {};
      priceByGroup[entry.groupName][entry.value] = price;
    }
  }

  for (const g of optionGroups) {
    const byValue: Record<string, number> = { ...(g.priceByValue ?? {}) };
    const fromSku = priceByGroup[g.name];
    if (fromSku) {
      for (const [val, price] of Object.entries(fromSku)) {
        if (g.values.includes(val)) byValue[val] = price;
      }
    }
    if (Object.keys(byValue).length > 0) g.priceByValue = byValue;
  }
}

export function buildSelectionPriceByKey(
  skuList: Array<Record<string, unknown>>,
  propKeyToGroupAndValue: Record<string, PropKeyEntry>,
  optionGroups: OptionGroup[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!skuList.length || !Object.keys(propKeyToGroupAndValue).length)
    return out;

  const aligned = alignPropKeyToFinalGroups(propKeyToGroupAndValue, optionGroups);

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
      const entry = aligned[part];
      if (entry) parts.push(entry);
    }
    if (parts.length === 0) continue;
    const key = buildSelectionKey(parts);
    out[key] = price;
    // Chaves parciais (só estilo ou só tamanho) para seleção incompleta no front
    for (const p of parts) {
      const partial = buildSelectionKey([p]);
      if (!(partial in out)) out[partial] = price;
    }
  }
  return out;
}

/** CSSBuy EN: "$ 26.40" por linha de tamanho — converte USD→CNY (taxa fixa alinhada ao site). */
const USD_TO_CNY = 7.25;

function priceCnyFromCssbuyLabel(priceLabel: string): number | null {
  const usdM = priceLabel.match(/\$\s*([\d.]+)/);
  if (usdM) {
    const usd = parseFloat(usdM[1]);
    if (Number.isFinite(usd) && usd > 0)
      return Math.round(usd * USD_TO_CNY * 100) / 100;
  }
  const cnyM = priceLabel.match(/(?:￥|¥)\s*([\d.]+)/);
  if (cnyM) {
    const raw = parseFloat(cnyM[1]);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    if (raw >= 500 && raw === Math.floor(raw)) return raw / 100;
    return raw;
  }
  return null;
}

function normalizeMatchLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

function labelMatchesOptionValue(label: string, value: string): boolean {
  const a = normalizeMatchLabel(label);
  const b = normalizeMatchLabel(value);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a)))
    return true;
  return false;
}

/** Preços do #sku_box do CSSBuy em grupos estilo/cor (miniaturas), não só tamanho. */
export function applyCssbuyVariantPriceRowsToOptionGroups(
  optionGroups: OptionGroup[],
  rows: { label: string; priceLabel: string }[],
): void {
  if (!rows.length) return;
  for (const row of rows) {
    const label = row.label.trim();
    if (!label) continue;
    const cny = priceCnyFromCssbuyLabel(row.priceLabel);
    if (cny == null) continue;

    for (const g of optionGroups) {
      for (const v of g.values) {
        if (!labelMatchesOptionValue(label, v)) continue;
        if (!g.priceByValue) g.priceByValue = {};
        g.priceByValue[v] = cny;
        if (!g.sourcePriceLabelByValue) g.sourcePriceLabelByValue = {};
        g.sourcePriceLabelByValue[v] = row.priceLabel;
      }
    }
  }
}

export function buildSelectionPriceByKeyFromGroups(
  optionGroups: OptionGroup[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of optionGroups) {
    const byVal = g.priceByValue;
    if (!byVal) continue;
    for (const [val, price] of Object.entries(byVal)) {
      if (!g.values.includes(val)) continue;
      const partial = buildSelectionKey([{ groupName: g.name, value: val }]);
      if (!(partial in out)) out[partial] = price;
    }
  }
  return out;
}

export function applyCssbuyRowPricesToOptionGroups(
  optionGroups: OptionGroup[],
  rows: { label: string; priceLabel: string }[],
): void {
  if (!rows.length) return;
  const sizeGroup = optionGroups.find((g) => SIZE_GROUP_NAME_RE.test(g.name));
  if (!sizeGroup) return;

  const priceByValue: Record<string, number> = {
    ...(sizeGroup.priceByValue ?? {}),
  };
  const sourcePriceLabelByValue: Record<string, string> = {
    ...(sizeGroup.sourcePriceLabelByValue ?? {}),
  };

  for (const row of rows) {
    const label = row.label.trim();
    if (!label) continue;
    sourcePriceLabelByValue[label] = row.priceLabel;
    const cny = priceCnyFromCssbuyLabel(row.priceLabel);
    if (cny != null) priceByValue[label] = cny;
  }
  if (Object.keys(priceByValue).length > 0) sizeGroup.priceByValue = priceByValue;
  if (Object.keys(sourcePriceLabelByValue).length > 0)
    sizeGroup.sourcePriceLabelByValue = sourcePriceLabelByValue;
}

/** Aplica preços SKU após todos os grupos de opções estarem finalizados. */
export function applyVariantPricingFromSkus(
  optionGroups: OptionGroup[],
  skuList: Array<Record<string, unknown>>,
  propKeyToGroupAndValue: Record<string, PropKeyEntry>,
  propsList: Record<string, unknown> | null | undefined,
  cssbuySkuRows?: { label: string; priceLabel: string }[],
  cssbuyVariantPriceRows?: { label: string; priceLabel: string }[],
): Record<string, number> {
  let selectionPriceByKey: Record<string, number> = {};
  if (skuList.length > 0) {
    let map = enrichPropKeyMapFromPropsList(
      propsList,
      optionGroups,
      propKeyToGroupAndValue,
    );
    map = alignPropKeyToFinalGroups(map, optionGroups);
    mergeSkuPricesIntoOptionGroups(optionGroups, skuList, map);
    selectionPriceByKey = buildSelectionPriceByKey(skuList, map, optionGroups);
  }
  if (cssbuySkuRows?.length)
    applyCssbuyRowPricesToOptionGroups(optionGroups, cssbuySkuRows);
  if (cssbuyVariantPriceRows?.length)
    applyCssbuyVariantPriceRowsToOptionGroups(
      optionGroups,
      cssbuyVariantPriceRows,
    );
  const fromGroups = buildSelectionPriceByKeyFromGroups(optionGroups);
  return { ...fromGroups, ...selectionPriceByKey };
}
