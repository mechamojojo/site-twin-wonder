import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";

/**
 * Sufixos de host que passam pelo proxy (mesma lista que backend/productImageAllowlist).
 */
const PROXY_HOST_SUFFIXES: string[] = [
  ".alicdn.com",
  ".alicdn.net",
  ".tbcdn.cn",
  ".taobaocdn.com",
  ".1688.com",
  ".geilicdn.com",
  ".weidian.com",
  ".jd.com",
  ".jdimg.com",
  ".360buyimg.com",
  ".pddpic.com",
  ".yangkeduo.com",
  ".kwcdn.com",
  ".kcdn.cn",
  ".yzcdn.cn",
  ".qpic.cn",
  ".myqcloud.com",
  ".dingtalk.com",
  ".goofish.com",
  ".vip.com",
  ".dangdang.com",
  ".cssbuy.com",
];

export function shouldProxyProductImageUrl(url: string): boolean {
  if (!url || url.startsWith("data:")) return false;
  try {
    const u = new URL(ensureHttpsImage(url.trim()));
    const h = u.hostname.toLowerCase();
    if (u.pathname.includes("/api/product-image")) return false;
    return PROXY_HOST_SUFFIXES.some(
      (suf) => h === suf.slice(1) || h.endsWith(suf),
    );
  } catch {
    return false;
  }
}

/** URL servida ao <img>: proxy same-origin-friendly para CDNs que quebram no Safari. */
export function productImageDisplayUrl(url: string): string {
  if (!url || url.startsWith("data:")) return url;
  const u = ensureHttpsImage(url.trim());
  if (!shouldProxyProductImageUrl(u)) return u;
  return apiUrl(`/api/product-image?url=${encodeURIComponent(u)}`);
}
