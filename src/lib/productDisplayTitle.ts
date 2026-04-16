/**
 * Título exibido no site: prioriza titlePt (PT), senão title (original).
 * Strings vazias são ignoradas para alinhar home, Explorar e /produto/:slug com o admin.
 */
export function productDisplayTitle(
  titlePt: string | null | undefined,
  title: string | null | undefined,
  fallback = "",
): string {
  const pt = typeof titlePt === "string" ? titlePt.trim() : "";
  if (pt) return pt;
  const t = typeof title === "string" ? title.trim() : "";
  if (t) return t;
  return fallback;
}

export function hasProductDisplayTitle(
  titlePt: string | null | undefined,
  title: string | null | undefined,
): boolean {
  return productDisplayTitle(titlePt, title).length > 0;
}

/**
 * Título no Explorar / cards: base + " - Nome do fornecedor" (evita duplicar sufixo).
 * Use `supplierName` como no cadastro (ex.: "Original", "Loja X").
 */
export function catalogCardTitle(
  titlePt: string | null | undefined,
  title: string | null | undefined,
  supplierName: string | null | undefined,
  fallback = "",
): string {
  const base = productDisplayTitle(titlePt, title, fallback);
  const s = typeof supplierName === "string" ? supplierName.trim() : "";
  if (!s) return base;
  const suffix = ` - ${s}`;
  const lower = base.toLowerCase();
  const suffLower = suffix.toLowerCase();
  if (lower.endsWith(suffLower)) return base;
  return base + suffix;
}

/** Quando há tag de fornecedor no card, o título fica só com o nome do produto (sem repetir o sufixo). */
export function catalogCardHeadline(
  titlePt: string | null | undefined,
  title: string | null | undefined,
  supplierName: string | null | undefined,
  fallback = "",
): string {
  if (supplierName?.trim()) {
    return productDisplayTitle(titlePt, title, fallback);
  }
  return catalogCardTitle(titlePt, title, supplierName, fallback);
}

export function supplierTagDisplay(supplierName: string): {
  label: string;
  isOriginal: boolean;
} {
  const t = supplierName.trim();
  if (!t) return { label: "", isOriginal: false };
  const isOriginal = t.toLowerCase() === "original";
  return { label: isOriginal ? "Original" : t, isOriginal };
}
