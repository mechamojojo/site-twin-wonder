import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Evita Mixed Content: converte http→https para imagens de CDNs (ex.: alicdn) que suportam HTTPS. */
export function ensureHttpsImage(url: string): string {
  if (!url || url.startsWith("data:")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http://")) return "https://" + url.slice(7);
  return url;
}

/**
 * Política de referrer para <img> de produtos.
 * `no-referrer` quebrava vários CDNs no Safari iOS (1688, Weidian, etc.) — eles
 * esperam pelo menos a origem do site. `strict-origin-when-cross-origin` envia
 * só origem em pedidos cross-site (HTTPS), compatível com hotlink comum.
 */
export function referrerPolicyForImage(
  url: string,
): HTMLImageElement["referrerPolicy"] | undefined {
  if (!url || url.startsWith("data:")) return "no-referrer";
  if (url.includes("/api/image-proxy")) return "no-referrer";
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "no-referrer";
  } catch {
    return "no-referrer";
  }
  return "strict-origin-when-cross-origin";
}

/**
 * Chave canônica para identificar o mesmo produto em URLs de marketplaces diferentes.
 * Usado para fazer merge de títulos do Explorar com produtos da API (ex.: prod vs localhost).
 */
export function productUrlToCanonicalKey(url: string | undefined): string {
  if (!url || !url.trim()) return "";
  const u = url.trim().toLowerCase();
  const weidianId =
    u.match(/itemid=(\d+)/i)?.[1] ?? u.match(/item-micro-(\d+)/)?.[1];
  if (weidianId) return `weidian:${weidianId}`;
  const taobaoId = u.match(/[?&]id=(\d+)/)?.[1];
  if (taobaoId) return `taobao:${taobaoId}`;
  const offerId = u.match(/offer\/(\d+)/i)?.[1] ?? u.match(/item-(\d+)\./)?.[1];
  if (offerId) return `1688:${offerId}`;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`.slice(0, 200);
  } catch {
    return url.slice(0, 200);
  }
}
