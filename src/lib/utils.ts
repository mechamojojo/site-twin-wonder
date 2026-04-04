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

/** CDNs que costumam falhar (403 / vazio no Safari) com Referer ausente — usar política padrão do browser. */
function imageHostAllowsDefaultReferrer(host: string): boolean {
  const h = host.toLowerCase();
  if (h.includes("cssbuy")) return true;
  if (
    h.includes("alicdn") ||
    h.includes("alibaba") ||
    h.includes("1688") ||
    h.includes("taobao") ||
    h.includes("tmall") ||
    h.includes("tbcdn") ||
    h.includes("gw.alicdn") ||
    h.includes("img.alicdn") ||
    h.includes("sc01.alicdn") ||
    h.includes("cbu01") ||
    h.includes("imgzone") ||
    h.includes("img-region") ||
    h.includes("imgregion")
  )
    return true;
  return false;
}

export function referrerPolicyForImage(
  url: string,
): HTMLImageElement["referrerPolicy"] | undefined {
  if (!url || url.startsWith("data:")) return "no-referrer";
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (imageHostAllowsDefaultReferrer(host)) return undefined;
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
