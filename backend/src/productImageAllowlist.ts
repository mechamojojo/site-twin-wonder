/**
 * Hosts permitidos para GET /api/product-image (anti-SSRF).
 * Manter alinhado com `src/lib/productImageDisplayUrl.ts`.
 */
const ALLOWED_HOST_SUFFIXES: string[] = [
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

function isProbablyPrivateOrLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local"))
    return true;
  if (h === "0.0.0.0") return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]),
    b = Number(m[2]),
    c = Number(m[3]),
    d = Number(m[4]);
  if ([a, b, c, d].some((n) => n > 255)) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function isAllowedProductImageUrl(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (isProbablyPrivateOrLocalHost(host)) return false;
  if (u.pathname.includes("product-image")) return false;

  const ok = ALLOWED_HOST_SUFFIXES.some(
    (suf) => host === suf.slice(1) || host.endsWith(suf),
  );
  return ok;
}

export function refererForImageHost(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("cssbuy")) return "https://www.cssbuy.com/";
  if (h.includes("1688")) return "https://detail.1688.com/";
  if (h.includes("weidian")) return "https://weidian.com/";
  if (h.includes("jd")) return "https://item.jd.com/";
  if (h.includes("pdd") || h.includes("yangkeduo") || h.includes("kwcdn"))
    return "https://mobile.yangkeduo.com/";
  return "https://item.taobao.com/";
}
