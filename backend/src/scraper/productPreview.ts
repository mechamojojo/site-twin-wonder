/**
 * Extrai título, preço, imagens e detalhes de uma página de produto.
 * Suporta: 1688, Taobao, TMALL, Weidian (integração CSSBuy = mesmos links que eles aceitam).
 * 1688: JSON embutido (imageList, skuProps, etc.); Taobao/TMALL: JSON (title, price, pic_url); Weidian: JSON + DOM.
 * Fallback genérico: DOM (og:image, imgs) para qualquer URL.
 */

import { translateToPortuguese } from "./translate";
import { normalizeProductTitle } from "./normalizeProductTitle";

export interface OptionGroup {
  name: string;
  values: string[];
  images: string[];
  /** When true, always show as image grid (e.g. Color); when false, always show as pills (e.g. Size, Quality grade). When undefined, use presence of images. */
  displayAsImages?: boolean;
  /** Inventory per value (e.g. size "M" -> 10). Used when no color selection needed. */
  inventoryByValue?: Record<string, number>;
  /** When product has color+size: inventory per (color, size). Outer key = color value. */
  inventoryByColorAndValue?: Record<string, Record<string, number>>;
  /** Price in CNY per option value (e.g. model "01" -> 69). From CSSBuy/source when each variant has different price. */
  priceByValue?: Record<string, number>;
}

export interface ProductPreviewResult {
  title: string | null;
  titlePt: string | null;
  priceCny: number | null;
  images: string[];
  variants: { color?: string[]; size?: string[]; colorImages?: string[] };
  /** Multiple option groups (e.g. style, color, size), each with optional thumbnail per value */
  optionGroups: OptionGroup[];
  specs: { key: string; value: string }[];
  description: string | null;
  rawUrl: string;
}

const SCRAPE_TIMEOUT_MS = 45000;
const SCRAPE_RETRY_COUNT = 2;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isValidProductImage(src: string): boolean {
  if (!src || src.startsWith("data:")) return false;
  const u = src.toLowerCase();
  return (
    u.includes("alicdn") ||
    u.includes("tbcdn") ||
    u.includes("1688") ||
    u.includes("geilicdn") ||
    u.includes("weidian") ||
    u.includes("jd.com") ||
    u.includes("jdimg") ||
    u.includes("pinduoduo") ||
    u.includes("dangdang") ||
    u.includes("vip.com") ||
    u.includes("goofish") ||
    u.includes("static") ||
    u.includes("img")
  );
}

/** Returns true if URL looks like a small/thumbnail image (we avoid these for main gallery). */
function isThumbnailUrl(url: string): boolean {
  const u = url.toLowerCase();
  // Small dimension suffixes: _60x60, _50x50, _100x100, _200x200 (2–3 digits only; _800x800 is not thumbnail)
  const smallSizeMatch = u.match(/_(\d{2,3})x(\d{2,3})([._]|$)/);
  if (smallSizeMatch) {
    const w = parseInt(smallSizeMatch[1], 10);
    const h = parseInt(smallSizeMatch[2], 10);
    if (w <= 250 && h <= 250) return true;
  }
  return (
    u.includes("thumbnail") ||
    u.includes("/thumb/") ||
    u.includes("_thumb") ||
    u.includes("_sum.") ||
    u.includes("_small") ||
    /_s\.(jpg|jpeg|png|webp)/i.test(u)  // _s = small on some CDNs
  );
}

/** Prefer large image: rewrite known thumbnail size suffixes to a large size (e.g. 800) for main gallery. */
function normalizeToLargeImageUrl(url: string): string {
  if (!url || url.startsWith("data:")) return url;
  // Replace small size suffixes like _60x60, _100x100, _200x200 with _800x800 (alicdn/tbcdn often support this)
  let out = url
    .replace(/_(\d{2,3})x(\d{2,3})(\.(jpg|jpeg|png|webp))?/gi, "_800x800$3")
    .replace(/_sum\./i, ".")
    .replace(/_thumb\./i, ".");
  return out || url;
}

function is1688Url(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("1688");
  } catch {
    return false;
  }
}

function isWeidianUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("weidian.com") || host.includes("v.weidian.com");
  } catch {
    return false;
  }
}

function isTaobaoOrTmallUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("taobao.com") || host.includes("tmall.com") || host.includes("tmall.hk");
  } catch {
    return false;
  }
}

function isGoofishUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("goofish.com") || host.includes("goofish.") || host === "2.taobao.com";
  } catch {
    return false;
  }
}

/** Nomes comuns de opções (1688/Taobao) em chinês → português */
const OPTION_NAME_ZH_TO_PT: Record<string, string> = {
  "颜色": "Cor",
  "颜色分类": "Cor / Modelo",
  "色彩": "Cor",
  "尺码": "Tamanho",
  "尺寸": "Tamanho",
  "规格": "Especificação",
  "款式": "Modelo / Estilo",
  "风格": "Estilo",
  "型号": "Modelo",
  "版型": "Modelo",
  "版本": "Versão",
  "套餐": "Kit / Opção",
  "容量": "Capacidade",
  "材质": "Material",
  "分类": "Tipo",
  "类型": "Tipo",
  "样式": "Estilo",
  "货号": "Ref.",
  "品牌": "Marca",
  "等级": "Qualidade",
  "品质等级": "Quality grade",
  "净含量": "Peso / Volume",
  "适用": "Uso",
};

const CSSBUY_BASE = "https://www.cssbuy.com";

/** Mapeamento CSSBuy item-{source}-{id}.html → URL original do marketplace */
const CSSBUY_ITEM_TO_MARKETPLACE: Record<string, (id: string) => string> = {
  "1688": (id) => `https://detail.1688.com/offer/${id}.html`,
  "taobao": (id) => `https://item.taobao.com/item.htm?id=${id}`,
  "tmall": (id) => `https://detail.tmall.com/item.htm?id=${id}`,
  "weidian": (id) => `https://weidian.com/item.html?itemID=${id}`,
  "jd": (id) => `https://item.jd.com/${id}.html`,
  "pinduoduo": (id) => `https://mobile.yangkeduo.com/goods.html?goods_id=${id}`,
  "vip": (id) => `https://detail.vip.com/detail-${id}.html`,
  "dangdang": (id) => `https://product.dangdang.com/${id}.html`,
};

/** Converte URL de marketplace para URL CSSBuy (formato suportado pelo CSSBuy). Retorna null se não conseguir. */
export function marketplaceToCssbuyUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("1688")) {
      const pathId = parsed.pathname.match(/\/offer\/(\d+)\.html/)?.[1] || parsed.pathname.match(/\/(\d+)\.html/)?.[1];
      const queryId = parsed.searchParams.get("offerId");
      const id = pathId || (queryId && /^\d+$/.test(queryId) ? queryId : null);
      if (id) return `${CSSBUY_BASE}/item-1688-${id}.html`;
    }
    if (host.includes("taobao.com") && !host.includes("tmall")) {
      const id = parsed.searchParams.get("id") || parsed.pathname.match(/\/item\.htm\?.*[?&]id=(\d+)/)?.[1];
      if (id && /^\d+$/.test(id)) return `${CSSBUY_BASE}/item-taobao-${id}.html`;
    }
    if (host.includes("tmall")) {
      const id = parsed.searchParams.get("id");
      if (id && /^\d+$/.test(id)) return `${CSSBUY_BASE}/item-tmall-${id}.html`;
    }
    if (host.includes("weidian")) {
      const id = parsed.searchParams.get("itemID") || parsed.searchParams.get("itemId") || parsed.pathname.match(/\/item\/(\d+)/)?.[1];
      if (id && /^\d+$/.test(id)) return `${CSSBUY_BASE}/item-micro-${id}.html`;
    }
    if (host.includes("jd.com") || host.includes("jd.")) {
      const id = parsed.pathname.match(/\/(\d{8,15})\.html/)?.[1] || parsed.searchParams.get("sku");
      if (id && /^\d+$/.test(id)) return `${CSSBUY_BASE}/item-jd-${id}.html`;
    }
    if (host.includes("pinduoduo") || host.includes("yangkeduo")) {
      const id = parsed.searchParams.get("goods_id") || parsed.searchParams.get("goodsId") || parsed.pathname.match(/goods_id=(\d+)/)?.[1];
      if (id && /^\d+$/.test(id)) return `${CSSBUY_BASE}/item-pinduoduo-${id}.html`;
    }
    if (host.includes("vip.com") || host.includes("vipshop")) {
      const pathMatch = parsed.pathname.match(/\/detail-([\d\-]+)\.html/);
      const id = pathMatch?.[1] || parsed.searchParams.get("product_id");
      if (id && /^[\d\-]+$/.test(id)) return `${CSSBUY_BASE}/item-vip-${id}.html`;
    }
    if (host.includes("dangdang")) {
      const id = parsed.pathname.match(/\/(\d+)\.html/)?.[1] || parsed.searchParams.get("product_id");
      if (id && /^\d+$/.test(id)) return `${CSSBUY_BASE}/item-dangdang-${id}.html`;
    }
  } catch (_) {}
  return null;
}

/** CSSBuy aceita links Taobao/1688/Weidian. Converte URLs CSSBuy (item-X-ID.html) para URL original ou extrai ?url=/?link= */
function resolveProductUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("cssbuy")) return url;

    const inner = parsed.searchParams.get("url") || parsed.searchParams.get("link") || parsed.searchParams.get("target");
    if (inner && (inner.startsWith("http://") || inner.startsWith("https://"))) return inner;

    // Formato: /item-1688-xxx.html, /item-taobao-xxx.html, /item-micro-xxx.html, /item-jd-xxx.html, etc.
    const match = parsed.pathname.match(/\/item-(1688|taobao|tmall|weidian|micro|jd|pinduoduo|vip|dangdang)-([\d\-]+)\.html$/i);
    if (match) {
      const [, source, id] = match;
      const key = source!.toLowerCase() === "micro" ? "weidian" : source!.toLowerCase();
      const toUrl = CSSBUY_ITEM_TO_MARKETPLACE[key];
      if (toUrl && id) return toUrl(id);
    }
  } catch (_) {}
  return url;
}

/** Verifica se é URL de produto CSSBuy (item-1688-xxx, item-micro-xxx, item-taobao-xxx, item-jd-xxx, etc.) */
function isCssbuyProductPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("cssbuy")) return false;
    // CSSBuy product pages can be:
    // - /item-taobao-823808975526.html (with explicit source)
    // - /item-823808975526.html (no explicit source)
    return (
      /\/item-[a-z0-9]+-[\d\-]+\.html/i.test(parsed.pathname) ||
      /\/item-\d+\.html/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Fluxo: SEMPRE passar pelo CSSBuy.
 * 1. Se o link já é CSSBuy → scrape CSSBuy
 * 2. Se o link é 1688/Taobao/TMall/Weidian → converte para CSSBuy → scrape CSSBuy
 * 3. Se conversão falhar (marketplace não suportado) → fallback: scrape direto do marketplace
 */
export async function getProductPreview(productUrl: string): Promise<ProductPreviewResult | null> {
  let cssbuyUrl: string | null = null;

  if (isCssbuyProductPage(productUrl)) {
    cssbuyUrl = productUrl;
  } else {
    cssbuyUrl = marketplaceToCssbuyUrl(productUrl);
    if (cssbuyUrl) {
      console.log("[scraper] Converted to CSSBuy:", productUrl.slice(0, 60), "→", cssbuyUrl);
    }
  }

  if (cssbuyUrl) {
    for (let attempt = 0; attempt <= SCRAPE_RETRY_COUNT; attempt++) {
      if (attempt > 0) {
        console.warn("[scraper] retry attempt", attempt, "for", cssbuyUrl);
        await new Promise((r) => setTimeout(r, 1500));
      }
      try {
        const { getCssbuyProductPreview } = await import("./cssbuyProductPreview");
        const cssbuyResult = await getCssbuyProductPreview(cssbuyUrl);
        if (cssbuyResult) {
          return { ...cssbuyResult, rawUrl: productUrl };
        }
      } catch (err) {
        console.warn("[scraper] CSSBuy scrape failed:", err);
      }
    }
    // CSSBuy falhou — tentar scrape da URL original (marketplace) para produtos que carregam no navegador
    if (productUrl !== cssbuyUrl) {
      console.log("[scraper] CSSBuy failed, trying original URL:", productUrl.slice(0, 60));
      for (let attempt = 0; attempt <= SCRAPE_RETRY_COUNT; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        const directResult = await getProductPreviewOnce(productUrl);
        if (directResult) {
          return { ...directResult, rawUrl: productUrl };
        }
      }
    }
    return null;
  }

  // Fallback: marketplace não suporta conversão para CSSBuy (ex.: Goofish, outros) → scrape direto
  console.log("[scraper] No CSSBuy conversion, scraping marketplace directly:", productUrl.slice(0, 60));
  for (let attempt = 0; attempt <= SCRAPE_RETRY_COUNT; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500));
    }
    const result = await getProductPreviewOnce(productUrl);
    if (result !== null) return result;
  }
  return null;
}

async function getProductPreviewOnce(productUrl: string): Promise<ProductPreviewResult | null> {
  let browser: Awaited<ReturnType<typeof import("playwright").chromium.launch>> | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
    });

    const context = await browser.newContext({
      userAgent: DEFAULT_USER_AGENT,
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      locale: "zh-CN",
    });

    const page = await context.newPage();

    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: SCRAPE_TIMEOUT_MS,
    }).catch(() => {});

    await page.waitForTimeout(3000);

    const is1688 = is1688Url(productUrl);
    const isWeidian = isWeidianUrl(productUrl);
    const isTaobaoOrTmall = isTaobaoOrTmallUrl(productUrl);
    const isGoofish = isGoofishUrl(productUrl);

    const data = await page.evaluate(({ is1688Page, isWeidianPage, isTaobaoPage }: { is1688Page: boolean; isWeidianPage: boolean; isTaobaoPage: boolean }) => {
      const result: {
        title: string | null;
        priceCny: number | null;
        images: string[];
        colorOptions: string[];
        colorOptionImages: string[];
        sizeOptions: string[];
        optionGroups: { name: string; values: string[]; images: string[] }[];
        specs: { key: string; value: string }[];
        description: string | null;
      } = {
        title: null,
        priceCny: null,
        images: [],
        colorOptions: [],
        colorOptionImages: [],
        sizeOptions: [],
        optionGroups: [],
        specs: [],
        description: null,
      };

      function tryParseJsonInScripts(): boolean {
        try {
          const scripts = document.querySelectorAll('script:not([src])');
          for (const script of scripts) {
            const text = script.textContent || "";
            if (text.length < 100) continue;

            const subjectMatch = text.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (subjectMatch) result.title = subjectMatch[1].replace(/\\"/g, '"').replace(/\\u002F/g, "/").trim();

            const priceMatch = text.match(/"priceValue"\s*:\s*"?(\d+\.?\d*)"?/);
            if (priceMatch && result.priceCny == null) result.priceCny = parseFloat(priceMatch[1]);
            if (result.priceCny == null) {
              const price2 = text.match(/"price"\s*:\s*\{[^}]*"value"\s*:\s*"?(\d+\.?\d*)"?/);
              if (price2) result.priceCny = parseFloat(price2[1]);
            }
            if (result.priceCny == null) {
              const price3 = text.match(/"salePrice"\s*:\s*"?(\d+\.?\d*)"?/);
              if (price3) result.priceCny = parseFloat(price3[1]);
            }
            if (result.priceCny == null) {
              const price4 = text.match(/"originalPrice"\s*:\s*"?(\d+\.?\d*)"?/);
              if (price4) result.priceCny = parseFloat(price4[1]);
            }
            if (result.priceCny == null) {
              const price5 = text.match(/"amount"\s*:\s*"?(\d+\.?\d*)"?/);
              if (price5) result.priceCny = parseFloat(price5[1]);
            }

            // Prefer detail images (usually clean product shots without white borders); fallback to main image list
            const detailListMatch = text.match(/"detailImageList"\s*:\s*\[(.*?)\]/s);
            if (detailListMatch) {
              const urls = detailListMatch[1].match(/"https?:\/\/[^"]+"/g);
              if (urls && urls.length > 0) result.images = urls.map((u) => u.replace(/^"|"$/g, "")).slice(0, 20);
            }
            if (result.images.length === 0) {
              const imgListMatch = text.match(/"imageList"\s*:\s*\[(.*?)\]/s);
              if (imgListMatch) {
                const urls = imgListMatch[1].match(/"https?:\/\/[^"]+"/g);
                if (urls) {
                  // Skip first image: on 1688 it's often the composite/banner with white borders; use clean product photos from index 1
                  const from = urls.length > 1 ? 1 : 0;
                  result.images = urls.map((u) => u.replace(/^"|"$/g, "")).slice(from, from + 20);
                }
              }
            }
            if (result.images.length === 0) {
              const offerImgMatch = text.match(/"offerImgList"\s*:\s*\[(.*?)\]/s);
              if (offerImgMatch) {
                const urls = offerImgMatch[1].match(/"https?:\/\/[^"]+"/g);
                if (urls) {
                  const from = urls.length > 1 ? 1 : 0;
                  result.images = urls.map((u) => u.replace(/^"|"$/g, "")).slice(from, from + 20);
                }
              }
            }
            // Prefer large images: normalize thumbnail size suffixes to 800px (e.g. _60x60 -> _800x800)
            if (result.images.length > 0) {
              result.images = result.images.map((u) => {
                if (typeof u !== "string") return u;
                let out = u.replace(/_(\d{2,3})x(\d{2,3})(\.(jpg|jpeg|png|webp))?/gi, "_800x800$3").replace(/_sum\./i, ".").replace(/_thumb\./i, ".");
                return out || u;
              });
            }
            // Múltiplos grupos de opções (skuProps 1688: estilo, cor, tamanho, etc.) com imagem por valor
            function extractValueAndImage(block: string): { values: string[]; images: string[] } {
              const values: string[] = [];
              const images: string[] = [];
              const fixStr = (s: string) => s.replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\u002F/g, "/").trim();
              // 1) propValues array: [{"value":"白色","image":"url"},...]
              const pvIdx = block.indexOf('"propValues":[');
              if (pvIdx !== -1) {
                const start = pvIdx + '"propValues":'.length;
                let depth = 1;
                let i = start;
                while (i < block.length && depth > 0) {
                  const c = block[i];
                  if (c === "[" || c === "{") depth++;
                  else if (c === "]" || c === "}") depth--;
                  i++;
                }
                const arrStr = block.slice(start + 1, i - 1);
                const objs = arrStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
                for (const obj of objs) {
                  const valM = obj.match(/"value"\s*:\s*"((?:[^"\\]|\\.)*)"/) || obj.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                  const imgM = obj.match(/"image"\s*:\s*"((?:[^"\\]|\\.)*)"/) || obj.match(/"imgUrl"\s*:\s*"((?:[^"\\]|\\.)*)"/) || obj.match(/"picUrl"\s*:\s*"((?:[^"\\]|\\.)*)"/) || obj.match(/"valueImage"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                  if (valM) {
                    values.push(fixStr(valM[1]));
                    images.push(imgM ? fixStr(imgM[1]) : "");
                  }
                }
                if (values.length > 0) return { values, images };
              }
              // 2) Inline: "value":"X", "image":"url" ou "image":"url", "value":"X"
              const valueImgRe = /"value"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[^{}]*?)?(?:"image"\s*:\s*"((?:[^"\\]|\\.)*)"|"imgUrl"\s*:\s*"((?:[^"\\]|\\.)*)"|"picUrl"\s*:\s*"((?:[^"\\]|\\.)*)")?/g;
              const imgValueRe = /"(?:image|imgUrl|picUrl)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"value"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              let vm;
              while ((vm = valueImgRe.exec(block)) !== null) {
                values.push(fixStr(vm[1]));
                images.push((vm[2] || vm[3] || vm[4] || "").replace(/\\\//g, "/"));
              }
              while ((vm = imgValueRe.exec(block)) !== null) {
                const v = fixStr(vm[2]);
                if (!values.includes(v)) {
                  values.push(v);
                  images.push(fixStr(vm[1]));
                }
              }
              return { values, images };
            }
            try {
              const idx = text.indexOf('"skuProps":[');
              if (idx !== -1) {
                const start = idx + '"skuProps":'.length;
                let depth = 1;
                let i = start;
                while (i < text.length && depth > 0) {
                  if (text[i] === '[') depth++;
                  else if (text[i] === ']') depth--;
                  i++;
                }
                const arrContent = text.slice(start, i - 1);
                const propNameRe = /"propName"\s*:\s*"([^"]+)"/g;
                const segments: { name: string; block: string }[] = [];
                let pm;
                while ((pm = propNameRe.exec(arrContent)) !== null) {
                  const blockStart = pm.index;
                  const blockEnd = arrContent.indexOf('"propName"', blockStart + 1);
                  const block = blockEnd === -1 ? arrContent.slice(blockStart) : arrContent.slice(blockStart, blockEnd);
                  segments.push({ name: pm[1].trim(), block });
                }
                for (const seg of segments) {
                  const { values, images } = extractValueAndImage(seg.block);
                  if (values.length > 0) {
                    const normImgs = images.slice(0, values.length).map((u) =>
                      u ? u.replace(/_(\d{2,3})x(\d{2,3})(\.(jpg|jpeg|png|webp))?/gi, "_200x200$3") : ""
                    );
                    result.optionGroups.push({ name: seg.name, values, images: normImgs });
                  }
                }
                // prop_imgs / propImgs: mapeia ID de valor para URL (fallback para imagens de variante)
                if (result.optionGroups.length > 0 && result.optionGroups[0].images.every((img) => !img)) {
                  const propImgsMatch = text.match(/"prop_imgs"\s*:\s*\{([^}]+)\}/) || text.match(/"propImgs"\s*:\s*\[([\s\S]*?)\]/);
                  if (propImgsMatch) {
                    const urls = propImgsMatch[1].match(/"https?:\/\/[^"]+"/g);
                    if (urls && urls.length > 0) {
                      const firstGroup = result.optionGroups[0];
                      const imgs = urls.map((u) => u.replace(/^"|"$/g, "").replace(/\\\//g, "/")).slice(0, firstGroup.values.length);
                      firstGroup.images = imgs.length >= firstGroup.values.length ? imgs : imgs.concat(new Array(firstGroup.values.length - imgs.length).fill(""));
                    }
                  }
                }
                // Backward compat: find color and size groups by name (not position)
                const isColorName = (n: string) => /颜色|色彩|color|cor|款式|estilo|style|modelo/i.test(n);
                const isSizeName = (n: string) => /尺码|尺寸|size|tamanho|规格/i.test(n);
                for (const g of result.optionGroups) {
                  if (isColorName(g.name) && result.colorOptions.length === 0) {
                    result.colorOptions = g.values;
                    result.colorOptionImages = g.images.slice(0, g.values.length);
                  }
                  if (isSizeName(g.name) && result.sizeOptions.length === 0) {
                    result.sizeOptions = g.values;
                  }
                }
              }
            } catch (_) {}

            if (result.title || result.priceCny != null || result.images.length > 0) return true;
          }
        } catch (_) {}
        return false;
      }

      if (is1688Page && tryParseJsonInScripts()) {
        // já preencheu do JSON; complementa com DOM se faltar algo
      }

      function tryParseTaobaoScripts(): boolean {
        if (!isTaobaoPage) return false;
        try {
          const scripts = document.querySelectorAll("script:not([src])");
          for (const script of scripts) {
            const text = script.textContent || "";
            if (text.length < 200) continue;
            const titleMatch = text.match(/"raw_title"\s*:\s*"((?:[^"\\]|\\.)*)"/) || text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (titleMatch) result.title = titleMatch[1].replace(/\\"/g, '"').replace(/\\u002F/g, "/").trim();
            const priceMatch = text.match(/"price"\s*:\s*"?(\d+\.?\d*)"?/) || text.match(/"lowPrice"\s*:\s*"?(\d+\.?\d*)"?/) || text.match(/"priceText"\s*:\s*"(\d+\.?\d*)"/);
            if (priceMatch && result.priceCny == null) result.priceCny = parseFloat(priceMatch[1]);
            const picMatch = text.match(/"pic_url"\s*:\s*"([^"]+)"/) || text.match(/"picUrl"\s*:\s*"([^"]+)"/);
            if (picMatch) result.images.push(picMatch[1].replace(/\\\//g, "/"));
            const imgsMatch = text.match(/"auctionImages"\s*:\s*\[(.*?)\]/s) || text.match(/"images"\s*:\s*\[(.*?)\]/s) || text.match(/"itemImgs"\s*:\s*\[(.*?)\]/s);
            if (imgsMatch && result.images.length <= 1) {
              const urls = imgsMatch[1].match(/"https?:\/\/[^"]+"/g);
              if (urls) result.images = urls.map((u) => u.replace(/^"|"$/g, "").replace(/\\\//g, "/")).slice(0, 20);
            }
            if (result.title || result.priceCny != null || result.images.length > 0) return true;
          }
        } catch (_) {}
        return false;
      }
      if (isTaobaoPage && tryParseTaobaoScripts()) {
        // Taobao/TMALL preenchido do JSON
      }

      if (isWeidianPage && result.images.length === 0) {
        try {
          const scripts = document.querySelectorAll("script:not([src])");
          for (const script of scripts) {
            const text = script.textContent || "";
            if (text.length < 200) continue;
            // Prefer picList (product-specific gallery) over mainPic (can be shop default on subdomains)
            const listMatch = text.match(/"picList"\s*:\s*\[(.*?)\]/s) || text.match(/"imageList"\s*:\s*\[(.*?)\]/s) || text.match(/"imgs"\s*:\s*\[(.*?)\]/s);
            if (listMatch) {
              const urls = listMatch[1].match(/"https?:\/\/[^"]+"/g);
              if (urls) result.images = urls.map((u) => u.replace(/^"|"$/g, "").replace(/\\\//g, "/")).slice(0, 20);
            }
            if (result.images.length === 0) {
              const picMatch = text.match(/"mainPic"\s*:\s*"([^"]+)"/) || text.match(/"picUrl"\s*:\s*"([^"]+)"/) || text.match(/"pic"\s*:\s*"([^"]+)"/);
              if (picMatch) result.images.push(picMatch[1].replace(/\\\//g, "/"));
            }
            if (result.images.length > 0) break;
          }
        } catch (_) {}
      }

      if (!result.title) {
        const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
        result.title = (ogTitle?.content || document.title || "").trim() || null;
      }

      if (result.priceCny == null) {
        const bodyText = document.body?.innerText || "";
        const cnyMatch = bodyText.match(/(?:￥|¥|CNY)\s*(\d+\.?\d*)/);
        if (cnyMatch) result.priceCny = parseFloat(cnyMatch[1]);
        if (result.priceCny == null) {
          const numMatch = bodyText.match(/(\d+\.?\d*)\s*(?:元|RMB|CNY)/);
          if (numMatch) result.priceCny = parseFloat(numMatch[1]);
        }
      }

      if (result.images.length === 0) {
        const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
        if (ogImage?.content) result.images.push(ogImage.content);
      }

      // Only collect DOM images when we have no gallery from JSON (main gallery = big images only)
      const minSize = 250;
      const isThumbnailLike = (url: string) => {
        const u = url.toLowerCase();
        const smallMatch = u.match(/_(\d{2,3})x(\d{2,3})([._]|$)/);
        if (smallMatch) { const w = parseInt(smallMatch[1],10); const h = parseInt(smallMatch[2],10); if (w <= 250 && h <= 250) return true; }
        return u.includes("thumbnail") || u.includes("/thumb/") || u.includes("_thumb") || u.includes("_sum.") || u.includes("_small") || /_s\.(jpg|jpeg|png|webp)/i.test(u);
      };
      if (result.images.length === 0) {
        const collectValidImages = (imgEls: NodeListOf<Element>) => {
          const urls: string[] = [];
          imgEls.forEach((img) => {
            const src = (img as HTMLImageElement).src;
            const w = (img as HTMLImageElement).naturalWidth || 0;
            const h = (img as HTMLImageElement).naturalHeight || 0;
            if (!src || w < minSize || h < minSize) return;
            if (isThumbnailLike(src)) return;
            const lower = src.toLowerCase();
            if (
              lower.includes("alicdn") || lower.includes("tbcdn") || lower.includes("1688") ||
              lower.includes("geilicdn") || lower.includes("weidian") || lower.includes("jd.com") || lower.includes("jdimg") ||
              lower.includes("pinduoduo") || lower.includes("dangdang") || lower.includes("vip.com") || lower.includes("goofish") ||
              lower.includes("static") ||
              (lower.includes("img") && (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.includes("image")))
            ) {
              if (!urls.includes(src)) urls.push(src);
            }
          });
          return urls;
        };
        if (isWeidianPage) {
          const gallerySelectors = [
            "[class*='detail'] img", "[class*='Detail'] img", "[class*='goods'] img", "[class*='Goods'] img",
            "[class*='gallery'] img", "[class*='Gallery'] img", "[class*='product'] img", "[class*='Product'] img",
            "[class*='main'] img", "[class*='Main'] img", "[class*='swiper'] img", ".goods-detail img",
            "[class*='item-detail'] img", "[class*='itemDetail'] img"
          ];
          for (const sel of gallerySelectors) {
            try {
              const imgs = document.querySelectorAll(sel);
              if (imgs.length > 0) {
                const urls = collectValidImages(imgs);
                if (urls.length > 0) {
                  result.images.push(...urls);
                  break;
                }
              }
            } catch (_) {}
          }
        }
        if (result.images.length === 0) {
          const imgs = document.querySelectorAll("img[src]");
          collectValidImages(imgs).forEach((src) => {
            if (!result.images.includes(src)) result.images.push(src);
          });
        }
        result.images = result.images.slice(0, 20);
      }
      result.images = result.images.slice(0, 20);

      // Remove da galeria principal imagens que são miniaturas de variante (evitar duplicar na esquerda)
      const variantImgSet = new Set<string>();
      for (const g of result.optionGroups) {
        for (const u of (g.images || [])) {
          if (u && u.startsWith("http")) variantImgSet.add(u);
        }
      }
      if (variantImgSet.size > 0 && result.images.length > 1) {
        const orig = [...result.images];
        result.images = result.images.filter((u) => !variantImgSet.has(u));
        if (result.images.length === 0 && orig.length > 0) result.images = [orig[0]];
      }

      // DOM fallback para imagens de variantes (1688: .sku-item img, li com img para cor)
      if (result.optionGroups.length > 0 && result.optionGroups.some((g) => g.images.every((i) => !i))) {
        const sel = "[class*='sku'] img, [class*='spec'] img, [class*='color'] img, .mod-sku img, [class*='prop'] img, li img[src]";
        const imgs = Array.from(document.querySelectorAll(sel)).map((el) => (el as HTMLImageElement).src).filter((s) => s && !s.startsWith("data:") && s.length > 30);
        const unique = Array.from(new Set(imgs));
        const needImgs = result.optionGroups.findIndex((g) => g.images.every((i) => !i));
        if (needImgs >= 0 && unique.length > 0) {
          const g = result.optionGroups[needImgs];
          const fill = unique.slice(0, g.values.length);
          result.optionGroups[needImgs].images = fill.concat(new Array(g.values.length - fill.length).fill(""));
        }
      }

      const selects = document.querySelectorAll("select");
      selects.forEach((sel) => {
        const options = Array.from(sel.querySelectorAll("option"))
          .map((o) => (o as HTMLOptionElement).textContent?.trim())
          .filter(Boolean) as string[];
        const label = (sel.getAttribute("name") || sel.id || "").toLowerCase();
        if (label.includes("color") || label.includes("cor") || label.includes("colour") || label.includes("estilo") || label.includes("style")) {
          if (result.colorOptions.length === 0) result.colorOptions = options.filter((o) => o && o.length < 80);
        } else if (label.includes("size") || label.includes("tamanho") || label.includes("dimension")) {
          result.sizeOptions = options.filter((o) => o && o.length < 80);
        }
      });
      // Listas de opções com miniatura (ex.: .sku-item com img)
      const skuItems = document.querySelectorAll("[class*='sku'], [class*='variant'], [class*='spec-item']");
      skuItems.forEach((item) => {
        const img = item.querySelector("img[src]");
        const text = (item as HTMLElement).textContent?.trim();
        if (text && text.length < 60 && !result.colorOptions.includes(text)) {
          const lower = (item.getAttribute("class") || "").toLowerCase();
          if (lower.includes("color") || lower.includes("cor") || lower.includes("estilo") || lower.includes("style") || result.colorOptions.length === 0) {
            result.colorOptions.push(text);
            if (img && (img as HTMLImageElement).src) result.colorOptionImages.push((img as HTMLImageElement).src);
          }
        }
      });

      if (result.specs.length === 0) {
        const rows = document.querySelectorAll("table tr, .spec-item, [class*='attr'], [class*='spec']");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, th, span, div");
          if (cells.length >= 2) {
            const key = (cells[0] as HTMLElement).textContent?.trim();
            const val = (cells[1] as HTMLElement).textContent?.trim();
            if (key && val && key.length < 80 && val.length < 200) result.specs.push({ key, value: val });
          }
        });
      }

      if (!result.description) {
        const descEl = document.querySelector("[class*='desc'], [class*='detail-desc'], #description, .product-desc");
        if (descEl) result.description = (descEl as HTMLElement).innerText?.slice(0, 1500) || null;
      }

      // Se temos color/size do DOM mas não optionGroups (ex.: página sem skuProps), montar um grupo
      if (result.optionGroups.length === 0 && (result.colorOptions.length > 0 || result.sizeOptions.length > 0)) {
        if (result.colorOptions.length > 0) {
          result.optionGroups.push({
            name: "cor / estilo",
            values: result.colorOptions,
            images: result.colorOptionImages.slice(0, result.colorOptions.length),
          });
        }
        if (result.sizeOptions.length > 0) {
          result.optionGroups.push({ name: "tamanho", values: result.sizeOptions, images: [] });
        }
      }

      return result;
    }, { is1688Page: is1688, isWeidianPage: isWeidian, isTaobaoPage: isTaobaoOrTmall || isGoofish });

    await context.close();

    const variants: { color?: string[]; size?: string[]; colorImages?: string[] } = {};
    if (data.colorOptions?.length) variants.color = data.colorOptions;
    if (data.sizeOptions?.length) variants.size = data.sizeOptions;
    if (data.colorOptionImages?.length) variants.colorImages = data.colorOptionImages.slice(0, data.colorOptions?.length || 0);

    const SIZE_GROUP_NAMES = /tamanho|size|尺码|尺寸|尺码选择/i;
    const COLOR_GROUP_NAMES = /cor|color|颜色|色彩|款式|style|estilo/i;
    if (!variants.color?.length || !variants.size?.length) {
      for (const g of data.optionGroups || []) {
        if (COLOR_GROUP_NAMES.test(g.name) && g.values?.length && !variants.color?.length) {
          variants.color = g.values;
          variants.colorImages = (g.images || []).slice(0, g.values.length);
        }
        if (SIZE_GROUP_NAMES.test(g.name) && g.values?.length && !variants.size?.length) {
          variants.size = g.values;
        }
      }
    }
    const isSizeGroup = (n: string, v?: string[]) => {
      if (v?.length && v.every((x) => /^(M|L|XL|XXL|2XL|3XL|S|XS|均码|自由|\d{2})$/i.test(x.trim()))) return true;
      return SIZE_GROUP_NAMES.test(n);
    };
    const optionGroups: OptionGroup[] = [];
    for (const g of data.optionGroups || []) {
      const values = g.values || [];
      const images = (g.images || []).slice(0, values.length);
      const namePt = OPTION_NAME_ZH_TO_PT[g.name.trim()] ?? (await translateToPortuguese(g.name.trim()));
      optionGroups.push({ name: namePt, values, images });
    }
    optionGroups.sort((a, b) => (isSizeGroup(a.name, a.values) && !isSizeGroup(b.name, b.values) ? 1 : !isSizeGroup(a.name, a.values) && isSizeGroup(b.name, b.values) ? -1 : 0));

    const images = [...(data.images || [])].filter(isValidProductImage);
    if (images.length === 0 && data.images?.length) images.push(...data.images);

    let titlePt: string | null = null;
    if (data.title && data.title.trim().length > 0) {
      titlePt = await translateToPortuguese(data.title);
      if (titlePt === data.title) titlePt = null;
    }
    const displayTitle = titlePt || data.title || null;
    const normalizedPt = displayTitle ? normalizeProductTitle(displayTitle) : null;

    return {
      title: data.title || null,
      titlePt: normalizedPt || titlePt || data.title || null,
      priceCny: data.priceCny != null ? data.priceCny : null,
      images,
      variants,
      optionGroups,
      specs: data.specs || [],
      description: data.description || null,
      rawUrl: productUrl,
    };
  } catch (err) {
    console.error("[scraper] getProductPreview error:", err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
