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
