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
