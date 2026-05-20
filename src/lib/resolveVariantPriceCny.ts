/**
 * Resolve o preço em CNY da variante selecionada (mesma lógica do CSSBuy: SKU = combinação de opções).
 */

export type OptionGroupForPricing = {
  name: string;
  values: string[];
  priceByValue?: Record<string, number>;
};

const isQualityGradeGroup = (name: string) =>
  /^Quality grade$/i.test(name) ||
  /品质等级|quality\s*level|quality\s*grade|nível\s*de\s*qualidade/i.test(
    name.trim(),
  );

const isSizeGroupName = (name: string) =>
  /tamanho|size|尺码|尺寸|鞋码|规格|内长|脚长|选择尺码|尺码选择/i.test(
    name.trim(),
  );

function buildSelectionKey(
  optionGroups: OptionGroupForPricing[],
  selectedOptionByGroup: Record<string, string>,
): string | null {
  const parts: string[] = [];
  for (const g of optionGroups) {
    const val = selectedOptionByGroup[g.name]?.trim();
    if (val) parts.push(`${g.name}=${val}`);
  }
  if (parts.length === 0) return null;
  return parts.sort().join("|");
}

function findBestPartialSelectionPrice(
  selectionPriceByKey: Record<string, number>,
  fullKey: string,
): number | null {
  if (selectionPriceByKey[fullKey] != null)
    return selectionPriceByKey[fullKey];

  const selectedParts = new Set(fullKey.split("|"));
  let best: { score: number; price: number } | null = null;

  for (const [key, price] of Object.entries(selectionPriceByKey)) {
    const keyParts = key.split("|");
    if (!keyParts.every((p) => selectedParts.has(p))) continue;
    const score = keyParts.length;
    if (!best || score > best.score) best = { score, price };
  }
  return best?.price ?? null;
}

function priceFromOptionGroups(
  optionGroups: OptionGroupForPricing[],
  selectedOptionByGroup: Record<string, string>,
): number | null {
  const groupsWithSelection = optionGroups.filter((g) => {
    const selected = selectedOptionByGroup[g.name]?.trim();
    return selected && g.priceByValue?.[selected] != null;
  });
  if (groupsWithSelection.length === 0) return null;

  const quality = groupsWithSelection.find((g) => isQualityGradeGroup(g.name));
  const styleOrColor = groupsWithSelection.find(
    (g) =>
      !isQualityGradeGroup(g.name) &&
      !isSizeGroupName(g.name) &&
      (g.priceByValue && Object.keys(g.priceByValue).length > 0),
  );
  const size = groupsWithSelection.find((g) => isSizeGroupName(g.name));

  const pick = (g: OptionGroupForPricing) => {
    const selected = selectedOptionByGroup[g.name]!.trim();
    return g.priceByValue![selected];
  };

  if (quality) return pick(quality);
  if (styleOrColor) return pick(styleOrColor);
  if (size) return pick(size);
  return pick(groupsWithSelection[0]);
}

export function resolveVariantPriceCny(params: {
  scrapedBaseCny: number | null;
  catalogBaseCny: number | null;
  optionGroups: OptionGroupForPricing[] | undefined;
  selectedOptionByGroup: Record<string, string>;
  selectionPriceByKey?: Record<string, number>;
}): number | null {
  const {
    scrapedBaseCny,
    catalogBaseCny,
    optionGroups,
    selectedOptionByGroup,
    selectionPriceByKey,
  } = params;

  const hasOptions =
    (optionGroups?.length ?? 0) > 0 &&
    Object.keys(selectedOptionByGroup).some(
      (k) => selectedOptionByGroup[k]?.trim(),
    );

  if (optionGroups?.length && selectionPriceByKey) {
    const key = buildSelectionKey(optionGroups, selectedOptionByGroup);
    if (key) {
      const fromSku = findBestPartialSelectionPrice(selectionPriceByKey, key);
      if (fromSku != null) return fromSku;
    }
  }

  if (optionGroups?.length) {
    const fromGroup = priceFromOptionGroups(
      optionGroups,
      selectedOptionByGroup,
    );
    if (fromGroup != null) return fromGroup;
  }

  // Sem variante escolhida: scrape; com variante, evitar preço fixo do catálogo que ignora o modelo
  if (hasOptions) return scrapedBaseCny;
  return scrapedBaseCny ?? catalogBaseCny;
}

export function hasVariantPricing(
  optionGroups: OptionGroupForPricing[] | undefined,
  selectionPriceByKey?: Record<string, number>,
): boolean {
  if (selectionPriceByKey && Object.keys(selectionPriceByKey).length > 0)
    return true;
  return (
    optionGroups?.some(
      (g) => g.priceByValue && Object.keys(g.priceByValue).length > 0,
    ) ?? false
  );
}
