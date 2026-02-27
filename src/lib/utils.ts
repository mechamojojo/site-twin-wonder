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
