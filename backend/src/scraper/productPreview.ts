/**
 * Extrai título, preço, imagens e detalhes de uma página de produto.
 * Suporta: 1688, Taobao, TMALL, Weidian (integração CSSBuy = mesmos links que eles aceitam).
 * 1688: JSON embutido (imageList, skuProps, etc.); Taobao/TMALL: JSON (title, price, pic_url); Weidian: JSON + DOM.
 * Fallback genérico: DOM (og:image, imgs) para qualquer URL.
 */

import { translateToPortuguese } from "./translate";

export interface OptionGroup {
  name: string;
  values: string[];
  images: string[];
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

const SCRAPE_TIMEOUT_MS = 35000;
const SCRAPE_RETRY_COUNT = 1;
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
  "色彩": "Cor",
  "尺码": "Tamanho",
  "尺寸": "Tamanho",
  "规格": "Especificação",
  "款式": "Estilo",
  "风格": "Estilo",
  "型号": "Modelo",
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
  "净含量": "Peso / Volume",
  "适用": "Uso",
};

/** CSSBuy aceita links Taobao/1688/Weidian — não scrapamos cssbuy.com; se houver ?url= no link, extraímos. */
function resolveProductUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase().includes("cssbuy")) {
      const inner = parsed.searchParams.get("url") || parsed.searchParams.get("link") || parsed.searchParams.get("target");
      if (inner && (inner.startsWith("http://") || inner.startsWith("https://"))) return inner;
    }
  } catch (_) {}
  return url;
}

export async function getProductPreview(productUrl: string): Promise<ProductPreviewResult | null> {
  const urlToScrape = resolveProductUrl(productUrl);
  for (let attempt = 0; attempt <= SCRAPE_RETRY_COUNT; attempt++) {
    if (attempt > 0) {
      console.warn("[scraper] retry attempt", attempt, "for", productUrl);
      await new Promise((r) => setTimeout(r, 1500));
    }
    const result = await getProductPreviewOnce(urlToScrape);
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
                  const values: string[] = [];
                  const images: string[] = [];
                  const valueImgRe = /"value"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"image"\s*:\s*"((?:[^"\\]|\\.)*)"|\s*,\s*"imgUrl"\s*:\s*"((?:[^"\\]|\\.)*)")?/g;
                  let vm;
                  while ((vm = valueImgRe.exec(seg.block)) !== null) {
                    values.push(vm[1].replace(/\\"/g, '"').replace(/\\\//g, "/").trim());
                    const img = vm[2] || vm[3];
                    images.push(img ? img.replace(/\\\//g, "/") : "");
                  }
                  if (values.length > 0) {
                    result.optionGroups.push({ name: seg.name, values, images: images.slice(0, values.length) });
                  }
                }
                // Backward compat: first group -> color; second -> size
                if (result.optionGroups.length > 0) {
                  const first = result.optionGroups[0];
                  result.colorOptions = first.values;
                  result.colorOptionImages = first.images.slice(0, first.values.length);
                  if (result.optionGroups.length > 1) {
                    result.sizeOptions = result.optionGroups[1].values;
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

    const optionGroups: OptionGroup[] = [];
    for (const g of data.optionGroups || []) {
      const values = g.values || [];
      const images = (g.images || []).slice(0, values.length);
      const namePt = OPTION_NAME_ZH_TO_PT[g.name.trim()] ?? (await translateToPortuguese(g.name.trim()));
      optionGroups.push({ name: namePt, values, images });
    }

    const images = [...(data.images || [])].filter(isValidProductImage);
    if (images.length === 0 && data.images?.length) images.push(...data.images);

    let titlePt: string | null = null;
    if (data.title && data.title.trim().length > 0) {
      titlePt = await translateToPortuguese(data.title);
      if (titlePt === data.title) titlePt = null;
    }

    return {
      title: data.title || null,
      titlePt: titlePt || data.title || null,
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
