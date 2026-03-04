const SUPPORTED_HOSTS = [
  "taobao", "1688", "weidian", "tmall", "jd.com", "pinduoduo", "yangkeduo",
  "goofish", "dangdang", "vip.com", "vipshop", "alicdn", "tbcdn", "geilicdn", "jdimg",
  "yupoo", // álbuns/catálogos; CSSBuy usa Quick Buy; scrape direto tenta extrair imagens
  "cssbuy", // aceita links CSSBuy com ?url= ou ?link= (o scraper extrai o link interno)
];

/** Verifica se o texto parece uma URL (http/https) */
export function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

/** Verifica se a URL é válida e de um marketplace suportado */
export function isValidProductUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    return SUPPORTED_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}
