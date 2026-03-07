import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Evita Mixed Content: converte http→https para imagens de CDNs (ex.: alicdn) que suportam HTTPS. */
export function ensureHttpsImage(url: string): string {
  if (!url || url.startsWith("data:")) return url;
  if (url.startsWith("http://")) return "https://" + url.slice(7);
  return url;
}

export function referrerPolicyForImage(url: string): HTMLImageElement["referrerPolicy"] | undefined {
  if (!url || url.startsWith("data:")) return "no-referrer";
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("cssbuy")) return undefined; // evita quebra de hotlink da CSSBuy
  } catch {
    // ignore
  }
  return "no-referrer";
}

/**
 * Chave canônica para identificar o mesmo produto em URLs de marketplaces diferentes.
 * Usado para fazer merge de títulos do Explorar com produtos da API (ex.: prod vs localhost).
 */
export function productUrlToCanonicalKey(url: string | undefined): string {
  if (!url || !url.trim()) return "";
  const u = url.trim().toLowerCase();
  const weidianId = u.match(/itemid=(\d+)/i)?.[1] ?? u.match(/item-micro-(\d+)/)?.[1];
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
