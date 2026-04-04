/**
 * Base URL da API em produção (Railway).
 * Em dev, vazio = usa proxy do Vite para localhost:4000
 */
export const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) || "";

// Debug: ver no Console (F12) qual URL está sendo usada
if (typeof window !== "undefined") {
  console.log("[ComprasChina] API_BASE:", API_BASE || "(vazio - requests vão para mesmo domínio)");
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** URL pública de arquivo servido pela API (ex.: upload do catálogo em /uploads/catalog/...). */
export function publicUploadUrl(pathFromApi: string): string {
  const p = pathFromApi.startsWith("/") ? pathFromApi : `/${pathFromApi}`;
  const base = (API_BASE || "").replace(/\/$/, "");
  if (base) return `${base}${p}`;
  if (typeof window !== "undefined") return `${window.location.origin}${p}`;
  return p;
}
