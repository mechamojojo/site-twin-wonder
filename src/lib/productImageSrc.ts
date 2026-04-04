import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";

/**
 * CDNs Alibaba (1688, Taobao, páginas CSSBuy item-1688-*) costumam bloquear pedidos
 * cujo Referer é o nosso site. Servimos essas imagens via /api/image-proxy com Referer
 * do marketplace. Weidian/geilicdn em geral não precisam.
 */
const ALIBABA_CDN =
  /alicdn|tbcdn|cbu01|imgzone|alibabausercontent|img-qc|sc01\.|gw\.alicdn|img\.alicdn|kwcdn\.com/i;

export function productPageImageSrc(
  imageUrl: string | null | undefined,
  productPageUrl: string | null | undefined,
): string {
  const u = ensureHttpsImage(String(imageUrl ?? "").trim());
  if (!u || u.startsWith("data:")) return u;
  if (u.includes("/api/image-proxy")) return u;
  const ref = String(productPageUrl ?? "").trim();
  if (!ref) return u;
  try {
    if (!ALIBABA_CDN.test(new URL(u).hostname)) return u;
  } catch {
    return u;
  }
  return apiUrl(
    `/api/image-proxy?src=${encodeURIComponent(u)}&ref=${encodeURIComponent(ref)}`,
  );
}
