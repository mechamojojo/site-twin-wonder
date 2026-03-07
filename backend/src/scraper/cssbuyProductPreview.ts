/**
 * Scraper específico para páginas de produto da CSSBuy.
 * A CSSBuy carrega dados via API/JS; extraímos do DOM renderizado ou de respostas interceptadas.
 */

import type { ProductPreviewResult, OptionGroup } from "./productPreview";
import { translateToPortuguese } from "./translate";
import { normalizeProductTitle } from "./normalizeProductTitle";

const SCRAPE_TIMEOUT_MS = 45000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isCssbuyProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.toLowerCase().includes("cssbuy") &&
      /\/item-[a-z0-9]+-\d+\.html/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function isCssbuyProductPage(url: string): boolean {
  return isCssbuyProductUrl(url);
}

export async function getCssbuyProductPreview(
  cssbuyUrl: string,
): Promise<ProductPreviewResult | null> {
  let browser: Awaited<
    ReturnType<typeof import("playwright").chromium.launch>
  > | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });

    const context = await browser.newContext({
      userAgent: DEFAULT_USER_AGENT,
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
      locale: "en-US",
    });

    const page = await context.newPage();

    const isItemMicro = /item-micro-/.test(cssbuyUrl);
    const capturedApiResponses: unknown[] = [];
    page.on("response", async (res) => {
      try {
        const url = res.url();
        const ct = res.headers()["content-type"] || "";
        if (!ct.includes("json")) return;
        const json = await res.json().catch(() => null);
        if (!json || typeof json !== "object") return;
        const o = json as Record<string, unknown>;
        const has = (x: unknown, k: string) =>
          x && typeof x === "object" && k in x;
        if (
          url.includes("/web/item") ||
          url.includes("/item") ||
          url.includes("itemId") ||
          url.includes("item/detail") ||
          url.includes("product/detail")
        ) {
          const d = o.data;
          if (d && Array.isArray(d) && d.length > 0) {
            capturedApiResponses.push(d[0]);
            if (d.length > 1 && typeof d[1] === "object")
              capturedApiResponses.push(d[1]);
          } else if (d && typeof d === "object" && !Array.isArray(d)) {
            capturedApiResponses.push(d);
          }
        }
        const d = o.data as Record<string, unknown> | undefined;
        const payload = d ?? o;
        if (
          has(o, "itemInfo") ||
          has(o, "skus") ||
          has(o, "props_list") ||
          has(o, "skuProps") ||
          (d &&
            typeof d === "object" &&
            (has(d, "itemInfo") || has(d, "skus") || has(d, "props_list")))
        ) {
          if (!Array.isArray(payload)) capturedApiResponses.push(payload);
        }
      } catch {
        // ignore
      }
    });

    const itemResponsePromise = page
      .waitForResponse(
        (res) => {
          const u = res.url();
          return (
            (u.includes("/web/item") ||
              u.includes("/item") ||
              u.includes("item/detail") ||
              u.includes("product/detail")) &&
            (res.request().method() === "POST" ||
              res.request().method() === "GET")
          );
        },
        { timeout: 20000 },
      )
      .then(async (res) => {
        try {
          const json = await res.json().catch(() => null);
          if (json?.data && typeof json.data === "object") {
            const d = json.data as unknown;
            if (Array.isArray(d) && d.length > 0) {
              capturedApiResponses.push(d[0]);
              if (d.length > 1 && typeof d[1] === "object")
                capturedApiResponses.push(d[1]);
            } else if (!Array.isArray(d)) {
              capturedApiResponses.push(d);
            }
          }
        } catch {
          // ignore
        }
      })
      .catch(() => null);

    await page
      .goto(cssbuyUrl, {
        waitUntil: "domcontentloaded",
        timeout: SCRAPE_TIMEOUT_MS,
      })
      .catch(() => {});

    await itemResponsePromise;
    await page.waitForTimeout(1200);

    await page.waitForSelector("img[src]", { timeout: 10000 }).catch(() => {});
    const baseWait = isItemMicro ? 3000 : 2500;
    await page.waitForTimeout(baseWait);

    if (isItemMicro) {
      await page
        .waitForSelector(
          "[class*='sku'], [class*='prop'], [class*='size'], [class*='color'], [class*='style']",
          { timeout: 3000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1500);
    }

    const data = await page.evaluate(() => {
      const result: {
        title: string | null;
        priceCny: number | null;
        images: string[];
        colorValues: string[];
        colorImages: string[];
        sizeValues: string[];
        fabricValues: string[];
        specs: { key: string; value: string }[];
      } = {
        title: null,
        priceCny: null,
        images: [],
        colorValues: [],
        colorImages: [],
        sizeValues: [],
        fabricValues: [],
        specs: [],
      };

      function tryFromWindow(): boolean {
        try {
          const win = window as unknown as Record<string, unknown>;
          for (const key of [
            "__INITIAL_STATE__",
            "__NUXT_DATA__",
            "__NEXT_DATA__",
            "pageData",
            "productData",
          ]) {
            const val = win[key];
            if (!val || typeof val !== "object") continue;
            const o = val as Record<string, unknown>;
            const data = o.data as Record<string, unknown> | undefined;
            const item = (o.itemInfo ?? data?.itemInfo ?? o.product) as
              | Record<string, unknown>
              | undefined;
            const pl = item?.props_list;
            if (pl && typeof pl === "object") {
              const colors: string[] = [];
              const imgs: string[] = [];
              for (const v of Object.values(pl as Record<string, unknown>)) {
                const x = v as Record<string, unknown>;
                const vs = String(x?.value ?? x?.value1 ?? "").trim();
                const img = x?.image ?? x?.imgUrl;
                if (vs && vs.length < 80 && !/^\d+$/.test(vs)) {
                  colors.push(vs);
                  if (img) imgs.push(String(img));
                }
              }
              if (colors.length > 0) {
                result.colorValues = colors;
                result.colorImages = imgs.slice(0, colors.length);
              }
            }
            const skus = (o.skus ?? data?.skus ?? item?.skus) as
              | { sku?: Array<{ properties?: string }> }
              | undefined;
            const list = skus?.sku ?? [];
            const sizes = new Set<string>();
            const propsMap = item?.props_list as
              | Record<string, { value?: string; value1?: string }>
              | undefined;
            for (const s of list) {
              const p = String(s?.properties ?? "");
              for (const part of p
                .split(";")
                .map((x) => x.trim())
                .filter(Boolean)) {
                const entry = propsMap
                  ? (
                      propsMap as Record<
                        string,
                        { value?: string; value1?: string }
                      >
                    )[part]
                  : undefined;
                const raw = entry?.value ?? entry?.value1 ?? part;
                const displayVal =
                  typeof raw === "string" && raw.includes(":")
                    ? raw.split(":").slice(-1)[0]?.trim() || raw
                    : raw;
                const v = String(displayVal).trim();
                // Only add values that are clearly sizes; avoid numeric option IDs (10–40) from color/style props
                const isSz =
                  /^(3[5-9]|4[0-8])(\.5)?$/.test(v) ||
                  /^[1-9]$/.test(v) ||
                  /^(M|L|XL|2XL|S|XS)$/i.test(v) ||
                  /^C\d+\/\d+cm$/i.test(v) ||
                  /^J\d+\/\d+cm$/i.test(v) ||
                  /^M\d+m?\d*\/[\d-]+ code$/i.test(v);
                if (isSz) sizes.add(v);
              }
            }
            if (sizes.size > 0) result.sizeValues = Array.from(sizes);
            if (result.colorValues.length > 0 || result.sizeValues.length > 0)
              return true;
          }
        } catch (_) {}
        return false;
      }

      tryFromWindow();

      function tryExtractFromScripts(): boolean {
        try {
          const scripts = document.querySelectorAll("script:not([src])");
          for (const s of scripts) {
            const text = s.textContent || "";
            if (text.length < 500) continue;
            const subjectMatch = text.match(
              /"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/,
            );
            if (subjectMatch)
              result.title = subjectMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\u002F/g, "/")
                .trim();
            const priceMatch =
              text.match(/"originPrice"\s*:\s*"?(\d+\.?\d*)"?/) ||
              text.match(/(?:￥|CNY)\s*(\d+\.?\d*)/);
            if (priceMatch && result.priceCny == null)
              result.priceCny = parseFloat(priceMatch[1]);
            const imgMatch =
              text.match(/"imageList"\s*:\s*\[(.*?)\]/s) ||
              text.match(/"picList"\s*:\s*\[(.*?)\]/s);
            if (imgMatch) {
              const urls = imgMatch[1].match(/"https?:\/\/[^"]+"/g);
              if (urls)
                result.images = urls
                  .map((u) => u.replace(/^"|"$/g, "").replace(/\\\//g, "/"))
                  .slice(0, 20);
            }
            const propsListMatch = text.match(/"props_list"\s*:\s*(\{[^}]+\})/);
            if (propsListMatch && result.colorValues.length === 0) {
              const str = propsListMatch[1];
              const propRe =
                /"(\d+:\d+)"\s*:\s*\{[^}]*"(?:value|value1)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              let m;
              const colors: string[] = [];
              const colorImgRe = /"image"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              const imgs: string[] = [];
              while ((m = propRe.exec(str)) !== null) {
                const v = m[2]
                  .replace(/\\"/g, '"')
                  .replace(/\\u002F/g, "/")
                  .trim();
                if (v && v.length < 50 && !/^\d+$/.test(v)) colors.push(v);
              }
              const imgUrls = str.match(
                /"https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*"/gi,
              );
              if (imgUrls)
                imgs.push(...imgUrls.map((u) => u.replace(/^"|"$/g, "")));
              if (colors.length > 0) {
                result.colorValues = colors;
                result.colorImages = imgs.slice(0, colors.length);
              }
            }
            const skuMatch = text.match(
              /"skus"\s*:\s*\{[^}]*"sku"\s*:\s*\[([\s\S]*?)\]/,
            );
            if (skuMatch && result.sizeValues.length === 0) {
              const skuStr = skuMatch[1];
              const sizeSet = new Set<string>();
              const sizeLikeRe =
                /(C\d+\/\d+cm|J\d+\/\d+cm|M\d+m?\d*\/[\d-]+ code|M\d+\/[\d-]+ code|M\d+ code)/gi;
              const fromProps = skuStr.match(sizeLikeRe);
              if (fromProps) fromProps.forEach((s) => sizeSet.add(s));
              const propRe = /"properties"\s*:\s*"[^"]*:(\d+):([^"\\;]+)/g;
              let pm;
              while ((pm = propRe.exec(skuStr)) !== null) {
                const val = pm[2].replace(/\\"/g, '"').trim();
                const isSz =
                  /^(3[6-9]|4[0-8])(\.5)?$/.test(val) ||
                  /^[1-9][0-2]?$/.test(val) ||
                  /^(M|L|XL|XXL|2XL|3XL|S)$/i.test(val) ||
                  /^C\d+\/\d+cm$/i.test(val) ||
                  /^J\d+\/\d+cm$/i.test(val) ||
                  /^M\d+m?\d*\/[\d-]+ code$/i.test(val);
                if (isSz) sizeSet.add(val);
              }
              const arr = Array.from(sizeSet);
              result.sizeValues = arr;
            }
            if (
              result.title ||
              result.priceCny != null ||
              result.images.length > 0 ||
              result.colorValues.length > 0
            )
              return true;
          }
        } catch (_) {}
        return false;
      }

      if (!tryExtractFromScripts()) {
        const scripts = document.querySelectorAll("script:not([src])");
        for (const s of scripts) {
          const text = s.textContent || "";
          if (text.indexOf("skuProps") === -1) continue;
          const idx = text.indexOf('"skuProps":[');
          if (idx !== -1) {
            const start = idx + '"skuProps":'.length;
            let depth = 1;
            let i = start;
            while (i < text.length && depth > 0) {
              if (text[i] === "[" || text[i] === "{") depth++;
              else if (text[i] === "]" || text[i] === "}") depth--;
              i++;
            }
            const arrContent = text.slice(start + 1, i - 1);
            const propNameRe = /"propName"\s*:\s*"([^"]+)"/g;
            let pm;
            while ((pm = propNameRe.exec(arrContent)) !== null) {
              const propName = pm[1].trim();
              const blockStart = pm.index;
              const blockEnd = arrContent.indexOf('"propName"', blockStart + 1);
              const block =
                blockEnd === -1
                  ? arrContent.slice(blockStart)
                  : arrContent.slice(blockStart, blockEnd);
              const valueRe = /"value"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              const imgRe = /"(?:image|imgUrl)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              const vals: string[] = [];
              const imgs: string[] = [];
              let vm;
              while ((vm = valueRe.exec(block)) !== null)
                vals.push(vm[1].replace(/\\"/g, '"').trim());
              let im;
              while ((im = imgRe.exec(block)) !== null)
                imgs.push(im[1].replace(/\\\//g, "/"));
              const isColorByName =
                /颜色|色彩|color|cor|款式|estilo|modelo|model|style/i.test(propName);
              const isSizeByName = /尺码|尺寸|size|tamanho/i.test(propName);
              const isFabricByName = /fabric|tecido|面料|材质/i.test(propName);
              const isRealSizeValue = (t: string) => {
                const v = t.trim();
                return (
                  /^(3[5-9]|4[0-8])(\.5)?$/.test(v) ||
                  /^[1-9][0-2]?$/.test(v) ||
                  /^(M|L|XL|XXL|2XL|3XL|S|XS|均码|自由)$/i.test(v) ||
                  /^C\d+\/\d+cm$/i.test(v) ||
                  /^J\d+\/\d+cm$/i.test(v) ||
                  /^M\d+m?\d*\/[\d-]+ code$/i.test(v) ||
                  /^M\d+\/[\d-]+ code$/i.test(v) ||
                  /^M\d+ code$/i.test(v)
                );
              };
              const valsLookLikeSizes =
                vals.length > 0 && vals.every((v) => isRealSizeValue(v));
              if (isFabricByName && vals.length > 0) {
                result.fabricValues = vals;
              } else if (isColorByName && vals.length > 0) {
                result.colorValues = vals;
                result.colorImages = imgs.slice(0, vals.length);
              } else if (isSizeByName && vals.length > 0 && valsLookLikeSizes) {
                result.sizeValues = vals;
              } else if (
                /规格|especificação/i.test(propName) &&
                vals.length > 0
              ) {
                if (valsLookLikeSizes) result.sizeValues = vals;
                else if (result.colorValues.length === 0) {
                  result.colorValues = vals;
                  result.colorImages = imgs.slice(0, vals.length);
                }
              }
            }
            break;
          }
        }
      }

      // Título: h1, .product-title, [class*="title"]
      const titleEl = document.querySelector(
        "h1, [class*='product-title'], [class*='item-title'], .goods-name",
      );
      if (titleEl)
        result.title = (titleEl as HTMLElement).innerText?.trim() || null;
      if (!result.title) {
        const og = document.querySelector('meta[property="og:title"]');
        if (og) result.title = (og as HTMLMetaElement).content?.trim() || null;
      }

      // Preço: procurar ￥ ou CNY
      const bodyText = document.body?.innerText || "";
      const cnyMatch = bodyText.match(/(?:￥|¥|CNY)\s*(\d+\.?\d*)/);
      if (cnyMatch) result.priceCny = parseFloat(cnyMatch[1]);

      // Imagens principais: galeria do produto
      const gallerySelectors = [
        "[class*='main'] img[src]",
        "[class*='gallery'] img[src]",
        "[class*='detail'] img[src]",
        ".product-img img",
        ".goods-img img",
        "[class*='swiper'] img[src]",
        "img[src*='alicdn'], img[src*='tbcdn'], img[src*='1688'], img[src*='geilicdn'], img[src*='cdn']",
      ];
      const seen = new Set<string>();
      const isProductImg = (s: string) => {
        const l = s.toLowerCase();
        return (
          (l.includes("alicdn") ||
            l.includes("tbcdn") ||
            l.includes("1688") ||
            l.includes("geilicdn") ||
            l.includes("cdn") ||
            l.includes("cssbuy") ||
            l.includes("/img/")) &&
          !l.includes("_60x60") &&
          !l.includes("_50x50") &&
          !l.includes("thumb") &&
          !l.includes("logo") &&
          !l.includes("avatar")
        );
      };
      for (const sel of gallerySelectors) {
        try {
          const imgs = document.querySelectorAll(sel);
          imgs.forEach((el) => {
            const src = (el as HTMLImageElement).src;
            if (!src || src.startsWith("data:") || seen.has(src)) return;
            if (isProductImg(src)) {
              seen.add(src);
              result.images.push(src);
            }
          });
          // Cap at 12 to avoid pulling in every variant/box shot from big grids
          if (result.images.length >= 12) break;
        } catch (_) {}
      }
      if (result.images.length === 0) {
        document.querySelectorAll("img[src]").forEach((el) => {
          const src = (el as HTMLImageElement).src;
          if (!src || src.startsWith("data:") || seen.has(src)) return;
          if (
            isProductImg(src) ||
            (src.length > 50 && !/logo|avatar|icon|thumb/i.test(src))
          ) {
            seen.add(src);
            result.images.push(src);
          }
        });
      }
      result.images = result.images.slice(0, 20);

      function extractColorOptions() {
        const labels = ["Color:", "Style:", "Model:", "Modelo:", "颜色", "款式", "Colour:"];
        function tryExtractFromContainer(container: Element): boolean {
          const imgs = Array.from(container.querySelectorAll("img[src]"));
          if (imgs.length < 2 || imgs.length > 80) return false;
          const added: string[] = [];
          for (let i = 0; i < imgs.length; i++) {
            const src = (imgs[i] as HTMLImageElement).src;
            if (
              !src ||
              src.startsWith("data:") ||
              result.colorImages.includes(src) ||
              added.includes(src)
            )
              continue;
            const wrapper = imgs[i].closest(
              "a, li, div, button, [role=button], span",
            );
            const name =
              wrapper
                ?.querySelector("[class*='name'], span, [class*='text']")
                ?.textContent?.trim() ||
              (wrapper as HTMLElement)?.getAttribute("title") ||
              "";
            result.colorImages.push(src);
            result.colorValues.push(name?.trim() || `Cor ${i + 1}`);
            added.push(src);
          }
          return result.colorImages.length > 0;
        }
        for (const label of labels) {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
          );
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const txt = node.textContent?.trim() || "";
            if (txt === label || (txt.includes(label) && txt.length < 100)) {
              let el = node.parentElement;
              for (let up = 0; up < 12 && el && el !== document.body; up++) {
                if (tryExtractFromContainer(el)) return;
                el = el.parentElement;
              }
            }
          }
        }
        for (const label of labels) {
          const els = document.querySelectorAll(
            "[class*='color'], [class*='Color'], [class*='style'], [class*='Style'], [class*='model'], [class*='Model']",
          );
          for (const el of els) {
            if (!(el as HTMLElement).textContent?.includes(label)) continue;
            if (tryExtractFromContainer(el)) return;
            const next =
              el.nextElementSibling || el.parentElement?.nextElementSibling;
            if (next && tryExtractFromContainer(next)) return;
          }
        }
        const byLabel = document.querySelectorAll("label, span, div, p");
        for (const el of byLabel) {
          const t = (el as HTMLElement).textContent?.trim() || "";
          if (
            (t === "Color:" ||
              t === "Style:" ||
              t === "Model:" ||
              t === "Modelo:" ||
              t.startsWith("Color:") ||
              t.startsWith("Style:") ||
              t.startsWith("Model:") ||
              t.startsWith("Modelo:") ||
              t.startsWith("Colour:")) &&
            t.length < 50
          ) {
            let parent = el.parentElement;
            for (let i = 0; i < 8 && parent; i++) {
              const imgs = parent.querySelectorAll("img[src]");
              if (imgs.length >= 2) {
                imgs.forEach((img, idx) => {
                  const src = (img as HTMLImageElement).src;
                  if (
                    src &&
                    !src.startsWith("data:") &&
                    !result.colorImages.includes(src)
                  ) {
                    result.colorImages.push(src);
                    result.colorValues.push(`Cor ${idx + 1}`);
                  }
                });
                return;
              }
              const btns = parent.querySelectorAll(
                "button, [role=button], a, span[class*='sku'], div[class*='option']",
              );
              const textColors: string[] = [];
              btns.forEach((b) => {
                const txt = (b as HTMLElement).textContent?.trim();
                if (
                  txt &&
                  txt.length >= 2 &&
                  txt.length <= 30 &&
                  !/^\d+$/.test(txt) &&
                  !/^(Size|Color|Style|M|L|XL|S)$/i.test(txt)
                ) {
                  textColors.push(txt);
                }
              });
              if (textColors.length > 0) {
                [...new Set(textColors)].forEach((c) => {
                  if (!result.colorValues.includes(c))
                    result.colorValues.push(c);
                });
                return;
              }
              parent = parent.parentElement;
            }
          }
        }
      }
      extractColorOptions();

      function extractFabricOptions() {
        const labels = ["Fabric:", "面料", "Tecido:", "Material:"];
        for (const label of labels) {
          const els = document.querySelectorAll("label, span, div, p");
          for (const el of els) {
            const t = (el as HTMLElement).textContent?.trim() || "";
            if (!t.includes(label) || t.length > 100) continue;
            let parent = el.closest("div") || el.parentElement;
            for (let i = 0; i < 6 && parent; i++) {
              const btns = parent.querySelectorAll(
                "button, [role=button], a, span[class*='sku'], div[class*='option']",
              );
              const found: string[] = [];
              btns.forEach((b) => {
                const txt = (b as HTMLElement).textContent?.trim();
                if (
                  txt &&
                  txt.length >= 2 &&
                  txt.length <= 50 &&
                  !/^\d+$/.test(txt) &&
                  !/^(Size|Color|Style|M|L|XL|S)$/i.test(txt)
                ) {
                  found.push(txt);
                }
              });
              if (found.length > 0) {
                [...new Set(found)].forEach((v) => {
                  if (!result.fabricValues.includes(v))
                    result.fabricValues.push(v);
                });
                return;
              }
              parent = parent.parentElement;
            }
          }
        }
        const fabricMatch =
          /(?:Fabric|面料|Tecido)[:\s]+([A-Za-z\u00C0-\u024F0-9\s,|]+?)(?=\n|Size:|$)/i.exec(
            document.body?.innerText || "",
          );
        if (fabricMatch) {
          const parts = fabricMatch[1]
            .split(/[,|]/)
            .map((p) => p.trim())
            .filter((p) => p.length >= 2 && p.length <= 40);
          parts.forEach((v) => {
            if (!result.fabricValues.includes(v)) result.fabricValues.push(v);
          });
        }
      }
      extractFabricOptions();

      if (result.colorValues.length === 0) {
        const bodyText = document.body?.innerText || "";
        const colorLabelMatch = bodyText.match(
          /(?:Color|Style|Colour|颜色|款式)[:\s]+([A-Za-z\u00C0-\u024F0-9\s,|]+?)(?=\n|Size:|Shoe size:|$)/i,
        );
        if (colorLabelMatch) {
          const parts = colorLabelMatch[1]
            .split(/[\s,|]+/)
            .map((p) => p.trim())
            .filter((p) => p.length >= 2 && p.length <= 25 && !/^\d+$/.test(p));
          if (parts.length > 0)
            parts.forEach((c) => {
              if (!result.colorValues.includes(c)) result.colorValues.push(c);
            });
        }
      }
      if (result.colorValues.length === 0) {
        const allSections = document.querySelectorAll(
          "[class*='color'], [class*='Color'], [class*='style'], [class*='Style'], [class*='sku'], [class*='spec']",
        );
        for (const cont of allSections) {
          const imgs = cont.querySelectorAll("img[src]");
          if (imgs.length >= 2 && imgs.length <= 40) {
            imgs.forEach((img, i) => {
              const src = (img as HTMLImageElement).src;
              if (
                !src ||
                src.startsWith("data:") ||
                result.colorImages.includes(src)
              )
                return;
              result.colorImages.push(src);
              result.colorValues.push(`Cor ${i + 1}`);
            });
            if (result.colorValues.length > 0) break;
          }
        }
      }

      function extractSizeOptions() {
        let foundSizeSection = false;
        const labels = ["Size:", "Shoe size:", "尺码", "规格", "Tamanho:"];
        for (const label of labels) {
          const els = document.querySelectorAll("label, span, div, p, td, th");
          for (const el of els) {
            const t = (el as HTMLElement).textContent?.trim() || "";
            if (!t.includes(label) || t.length > 200) continue;
            let parent = el.closest("div") || el.parentElement;
            for (let i = 0; i < 6 && parent; i++) {
              const btns = parent.querySelectorAll(
                "button, [role=button], a, div[class*='size'], span",
              );
              const found: string[] = [];
              btns.forEach((b) => {
                const txt = (b as HTMLElement).textContent?.trim();
                if (txt && txt.length <= 6) {
                  if (
                    /^(3[5-9]|4[0-8])(\.5)?$/.test(txt) ||
                    /^[1-9][0-2]?$/.test(txt)
                  )
                    found.push(txt);
                  if (/^(M|L|XL|2XL|S|XS|X\s*L)$/i.test(txt))
                    found.push(
                      txt
                        .replace(/\s+/g, "")
                        .toUpperCase()
                        .replace("XXL", "2XL"),
                    );
                }
              });
              const fromText = (parent as HTMLElement).innerText?.match(
                /\b(35|35\.5|36|36\.5|37|37\.5|38|38\.5|39|39\.5|40|40\.5|41|41\.5|42|42\.5|43|43\.5|44|44\.5|45|45\.5|46|46\.5|47|47\.5|48|1|2|3|4|5|6|7|8|9|10|11|12)\b/g,
              );
              if (fromText) found.push(...fromText);
              if (found.length > 0) {
                foundSizeSection = true;
                [...new Set(found)].forEach((s) => {
                  if (!result.sizeValues.includes(s)) result.sizeValues.push(s);
                });
                result.sizeValues.sort((a, b) =>
                  /^\d+$/.test(a) && /^\d+$/.test(b)
                    ? parseInt(a, 10) - parseInt(b, 10)
                    : a.localeCompare(b),
                );
                return;
              }
              parent = parent.parentElement;
            }
          }
        }
        // Only run body-text fallbacks when we found a real Size section in the DOM.
        // Otherwise we would invent sizes from random numbers (price, item ID, etc.).
        if (!foundSizeSection) return;

        const allText = document.body?.innerText || "";
        const shoe = allText.match(
          /\b(35|35\.5|36|36\.5|37|37\.5|38|38\.5|39|39\.5|40|40\.5|41|41\.5|42|42\.5|43|43\.5|44|44\.5|45|45\.5|46|46\.5|47|47\.5|48)\b/g,
        );
        const childSizes = allText.match(
          /(C\d+\/\d+cm|J\d+\/\d+cm|M\d+m?\d*\/[\d-]+ code|M\d+\/[\d-]+ code|M\d+ code)/gi,
        );
        if (childSizes)
          [...new Set(childSizes)].forEach((s) => {
            if (!result.sizeValues.includes(s)) result.sizeValues.push(s);
          });
        const sizeLabel = /(?:Size|Shoe size|尺码|规格)[:\s]*([\d\s.]+)/i.exec(
          allText,
        );
        const smallNum = sizeLabel
          ? sizeLabel[1].match(/\b([1-9]|1[0-2]|\d{2}(?:\.5)?)\b/g)
          : null;
        if (shoe) {
          [...new Set(shoe)]
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .forEach((s) => {
              if (!result.sizeValues.includes(s)) result.sizeValues.push(s);
            });
        }
        if (smallNum && result.sizeValues.length === 0) {
          [...new Set(smallNum)]
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .forEach((s) => {
              if (!result.sizeValues.includes(s)) result.sizeValues.push(s);
            });
        }
        const sizeTextMatch =
          /(?:Size|Shoe size|尺码)[:\s]*([SMLXL\s\d]+)/i.exec(allText);
        if (sizeTextMatch && result.sizeValues.length === 0) {
          const raw = sizeTextMatch[1]
            .replace(/X\s*L/gi, "XL")
            .split(/\s+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
          const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
          const valid = raw.filter((p) =>
            /^(S|M|L|XL|2XL|3XL|XS|\d+)$/i.test(p),
          );
          valid.sort((a, b) => {
            const ia = order.indexOf(a.toUpperCase());
            const ib = order.indexOf(b.toUpperCase());
            if (ia >= 0 && ib >= 0) return ia - ib;
            if (/^\d+$/.test(a) && /^\d+$/.test(b))
              return parseInt(a, 10) - parseInt(b, 10);
            return 0;
          });
          valid.forEach((s) => {
            if (!result.sizeValues.includes(s)) result.sizeValues.push(s);
          });
        }
        const clothing = allText.match(/\b(S|M|L|XL|X\s*L|2XL|XXL|3XL|XS)\b/gi);
        if (clothing && result.sizeValues.length === 0) {
          const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
          const normalized = [
            ...new Set(
              clothing.map((s) =>
                s.replace(/\s+/g, "").toUpperCase().replace("XXL", "2XL"),
              ),
            ),
          ];
          normalized.sort((a, b) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
          });
          normalized.forEach((s) => result.sizeValues.push(s));
        }
      }
      extractSizeOptions();

      return result;
    });

    const isSizeLike = (v: string) => {
      const t = v.trim();
      const baseNum = t
        .replace(/\s*(men|women|男|女|male|female)$/i, "")
        .trim();
      return (
        /^(3[4-9]|4[0-8])(\.5)?(\s*(men|women|男|女))?$/i.test(t) ||
        /^\d{2,3}\s*(men|women|男|女|male|female)$/i.test(t) ||
        (baseNum !== t && /^(3[4-9]|4[0-8]|\d{2})$/.test(baseNum)) ||
        /^[1-9][0-2]?$/.test(t) ||
        /^(M|L|XL|XXL|2XL|3XL|4XL|S|XS)$/i.test(t) ||
        /^(Large|Medium|Small|One\s*Size|Free\s*Size)$/i.test(t) ||
        /^(大|中|小|均码|自由)$/.test(t) ||
        /^C\d+\/\d+cm$/i.test(t) ||
        /^J\d+\/\d+cm$/i.test(t) ||
        /^M\d+m?\d*\/[\d-]+ code$/i.test(t) ||
        /^M\d+\/[\d-]+ code$/i.test(t) ||
        /^\d+码$/i.test(t) ||
        /^\d+号$/i.test(t) ||
        /^(均码|自由)$/i.test(t)
      );
    };

    function mergeFromApiResponses(apiList: unknown[]) {
      let bestPropsList:
        | Record<
            string,
            {
              value?: string;
              value1?: string;
              image?: string;
              properties?: string;
            }
          >
        | undefined;
      let bestSkuProps:
        | Array<{ propName?: string; value?: string; values?: unknown }>
        | undefined;
      let bestSkuList: Array<{
        properties?: string;
        price?: number;
        quantity?: number;
      }> = [];

      function findInObj(obj: unknown, keys: string[], depth = 0): unknown {
        if (depth > 4 || !obj || typeof obj !== "object") return undefined;
        const r = obj as Record<string, unknown>;
        for (const k of keys) {
          if (k in r && r[k] != null) return r[k];
        }
        for (const v of Object.values(r)) {
          const found = findInObj(v, keys, depth + 1);
          if (found != null) return found;
        }
        return undefined;
      }

      for (const api of apiList) {
        if (!api || typeof api !== "object") continue;
        const r = api as Record<string, unknown>;
        const itemInfo = (r.itemInfo ??
          r ??
          findInObj(r, ["itemInfo", "product", "item", "skuCore"])) as
          | Record<string, unknown>
          | undefined;
        const pl = (itemInfo?.props_list ??
          r.props_list ??
          findInObj(r, ["props_list", "propsList"])) as
          | typeof bestPropsList
          | undefined;
        let sp = (r.skuProps ??
          itemInfo?.skuProps ??
          findInObj(r, ["skuProps"])) as typeof bestSkuProps | undefined;
        if (!sp) {
          const skuCore = findInObj(r, ["skuCore"]) as
            | Record<string, unknown>
            | unknown[]
            | undefined;
          if (skuCore && Array.isArray(skuCore))
            sp = skuCore as typeof bestSkuProps;
          else if (
            skuCore &&
            typeof skuCore === "object" &&
            "skuProps" in skuCore
          )
            sp = (skuCore as { skuProps: unknown })
              .skuProps as typeof bestSkuProps;
        }
        const skObj = r.skus ?? itemInfo?.skus ?? findInObj(r, ["skus"]);
        const sk =
          skObj && typeof skObj === "object" && "sku" in skObj
            ? (skObj as { sku: unknown[] }).sku
            : [];
        if (
          pl &&
          typeof pl === "object" &&
          Object.keys(pl).length >
            (bestPropsList ? Object.keys(bestPropsList).length : 0)
        )
          bestPropsList = pl;
        if (sp && Array.isArray(sp) && sp.length > (bestSkuProps?.length ?? 0))
          bestSkuProps = sp;
        if (Array.isArray(sk) && sk.length > bestSkuList.length)
          bestSkuList = sk as typeof bestSkuList;
      }
      return { bestPropsList, bestSkuProps, bestSkuList };
    }

    const { bestPropsList, bestSkuProps, bestSkuList } =
      mergeFromApiResponses(capturedApiResponses);
    const propsList = bestPropsList;
    const skuProps = bestSkuProps;
    const skuList = bestSkuList;

    const apiTitle = (() => {
      for (const api of capturedApiResponses) {
        if (!api || typeof api !== "object") continue;
        const r = api as Record<string, unknown>;
        const ii = r.itemInfo ?? r;
        const t = (ii as Record<string, unknown>)?.title ?? r.title;
        if (t && typeof t === "string" && t.trim().length > 0) return t.trim();
      }
      return null;
    })();
    if (apiTitle && (!data.title || data.title.trim().length === 0))
      data.title = apiTitle;

    const apiPrice = (() => {
      for (const api of capturedApiResponses) {
        if (!api || typeof api !== "object") continue;
        const r = api as Record<string, unknown>;
        const ii = r.itemInfo ?? r;
        const p =
          (ii as Record<string, unknown>)?.price ??
          r.price ??
          (ii as Record<string, unknown>)?.originPrice;
        if (p != null && typeof p === "number" && p > 0) return p;
        if (p != null && typeof p === "string") return parseFloat(p);
      }
      return null;
    })();
    if (apiPrice != null && (data.priceCny == null || data.priceCny <= 0))
      data.priceCny = apiPrice;

    const apiImages = (() => {
      for (const api of capturedApiResponses) {
        if (!api || typeof api !== "object") continue;
        const r = api as Record<string, unknown>;
        const ii = r.itemInfo ?? r;
        const imgs =
          (ii as Record<string, unknown>)?.item_imgs ??
          (ii as Record<string, unknown>)?.pic_url;
        if (Array.isArray(imgs) && imgs.length > 0) {
          return imgs.map((x: unknown) =>
            x && typeof x === "object" && "url" in x
              ? String((x as { url: string }).url)
              : String(x),
          );
        }
        if (typeof imgs === "string") return [imgs];
      }
      return null;
    })();
    if (
      apiImages &&
      apiImages.length > 0 &&
      (data.images.length === 0 ||
        data.images.every((s) => !s || s.length < 10))
    )
      data.images = apiImages;

    const propsImg = (() => {
      for (const api of capturedApiResponses) {
        if (!api || typeof api !== "object") continue;
        const r = api as Record<string, unknown>;
        const ii = r.itemInfo ?? r;
        const img = (ii as Record<string, unknown>)?.props_img;
        if (img && typeof img === "object")
          return img as Record<string, string>;
      }
      return undefined;
    })();

    const isSizeLabel = (label: string) =>
      /^size|尺码|尺寸|tamanho|规格|shoe|鞋码/i.test(label.trim());
    const isColorLabel = (label: string) =>
      /^color|colour|颜色|款式|style|estilo|cor|model|modelo/i.test(label.trim());

    if (propsList && typeof propsList === "object") {
      const colors: string[] = [];
      const imgs: string[] = [];
      const sizes = new Set<string>();
      const plEntries = Object.entries(propsList);
      for (const [key, v] of plEntries) {
        if (v == null) continue;
        let raw: string;
        let img: string | undefined;
        if (typeof v === "string") {
          raw = v;
          img = propsImg?.[key];
        } else if (typeof v === "object") {
          raw = String(
            (v as { value?: string; value1?: string }).value ??
              (v as { value1?: string }).value1 ??
              "",
          );
          img = (v as { image?: string }).image ?? propsImg?.[key];
        } else continue;
        const colonIdx = raw.indexOf(":");
        const label = colonIdx >= 0 ? raw.slice(0, colonIdx).trim() : "";
        const val = colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw.trim();
        if (!val || val.length > 50) continue;
        if (label && isSizeLabel(label) && isSizeLike(val)) {
          sizes.add(val);
        } else if (label && isColorLabel(label)) {
          if (!colors.includes(val)) {
            colors.push(val);
            imgs.push(img || "");
          }
        } else if (isSizeLike(val)) {
          sizes.add(val);
        } else if (!/^\d+$/.test(val) && !colors.includes(val)) {
          colors.push(val);
          imgs.push(img || "");
        }
      }
      if (colors.length > 0) {
        data.colorValues = colors;
        data.colorImages = imgs.length ? imgs : data.colorImages;
      }
      if (sizes.size > 0) {
        const arr = Array.from(sizes);
        const extractNum = (s: string) =>
          parseFloat(s.replace(/\s*(men|women|男|女)$/i, "")) || 0;
        const allNumeric = arr.every(
          (s) =>
            /^\d{2,3}(\s*(men|women))?$/i.test(s.trim()) ||
            /^\d{1,2}$/.test(s.trim()),
        );
        if (allNumeric) arr.sort((a, b) => extractNum(a) - extractNum(b));
        if (arr.length > data.sizeValues.length) data.sizeValues = arr;
        else if (data.sizeValues.length === 0) data.sizeValues = arr;
      }
    }

    if (skuProps && Array.isArray(skuProps) && data.colorValues.length === 0) {
      for (const prop of skuProps) {
        const name = String(prop.propName ?? "").toLowerCase();
        if (!/style|color|colour|颜色|款式|estilo|model|modelo/.test(name)) continue;
        const valuesArr = (
          prop as { values?: Array<{ value?: string; image?: string }> }
        ).values;
        if (valuesArr && Array.isArray(valuesArr)) {
          const vals: string[] = [];
          const imgs: string[] = [];
          for (const v of valuesArr) {
            const txt = String(v?.value ?? "").trim();
            if (txt && !isSizeLike(txt)) {
              vals.push(txt);
              imgs.push(v?.image ?? "");
            }
          }
          if (vals.length > 0) {
            data.colorValues = vals;
            data.colorImages = imgs;
          }
        } else if (prop.value) {
          const vals = String(prop.value)
            .split(/[,|]/)
            .map((s) => s.trim())
            .filter((s) => s && !isSizeLike(s));
          if (vals.length > 0)
            vals.forEach((v) => {
              if (!data.colorValues.includes(v)) data.colorValues.push(v);
            });
        }
      }
    }
    if (skuProps && Array.isArray(skuProps) && data.sizeValues.length === 0) {
      for (const prop of skuProps) {
        const name = String(
          (prop as Record<string, unknown>).propName ??
            (prop as Record<string, unknown>).prop ??
            "",
        ).toLowerCase();
        const isSizeProp =
          /size|尺码|尺寸|tamanho|规格|码选择|选择尺码|spec/i.test(name);
        const valuesArr = (
          prop as {
            values?: Array<{
              value?: string;
              valueDisplay?: string;
              name?: string;
            }>;
            valueList?: string[];
          }
        ).values;
        const valueList = (prop as { valueList?: string[] }).valueList;
        const getVals = (): string[] => {
          if (valuesArr && Array.isArray(valuesArr)) {
            return valuesArr
              .map((v) =>
                String(v?.value ?? v?.valueDisplay ?? v?.name ?? "").trim(),
              )
              .filter((s) => s && s.length < 50);
          }
          if (valueList && Array.isArray(valueList))
            return valueList
              .map((s) => String(s).trim())
              .filter((s) => s && s.length < 50);
          if (prop.value)
            return String(prop.value)
              .split(/[,|，|;]/)
              .map((s) => s.trim())
              .filter((s) => s && s.length < 50);
          return [];
        };
        const vals = getVals();
        // Only accept as sizes when values look like real sizes (not option IDs like 10–40)
        if (vals.length > 0 && isSizeProp && vals.every((v) => isSizeLike(v))) {
          data.sizeValues = vals;
          break;
        }
      }
    }

    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    for (const sku of skuList) {
      const props = String(
        sku.properties ?? (sku as Record<string, unknown>).propertiesStr ?? "",
      );
      for (const part of props
        .split(/[;，,]/)
        .map((p) => p.trim())
        .filter(Boolean)) {
        const entry = propsList
          ? (propsList as Record<string, unknown>)[part]
          : undefined;
        let raw: string;
        if (typeof entry === "string") raw = entry;
        else if (
          entry &&
          typeof entry === "object" &&
          (entry as Record<string, unknown>).value != null
        )
          raw = String(
            (entry as { value?: string }).value ??
              (entry as { value1?: string }).value1 ??
              "",
          );
        else raw = part;
        const colonIdx = raw.indexOf(":");
        const label = colonIdx >= 0 ? raw.slice(0, colonIdx).trim() : "";
        const v = colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw.trim();
        if (!v || v.length > 50) continue;
        if (label && isSizeLabel(label) && isSizeLike(v)) sizeSet.add(v);
        else if (label && isColorLabel(label)) colorSet.add(v);
        else if (isSizeLike(v)) sizeSet.add(v);
        else if (!/^\d+$/.test(v)) colorSet.add(v);
      }
    }
    if (sizeSet.size > 0 && data.sizeValues.length === 0) {
      data.sizeValues = Array.from(sizeSet);
    }
    if (colorSet.size > 0 && data.colorValues.length === 0) {
      data.colorValues = Array.from(colorSet);
      const colorImgs: string[] = [];
      for (const _ of data.colorValues) colorImgs.push("");
      if (propsList && typeof propsList === "object") {
        const plEntries = Object.entries(propsList) as [
          string,
          string | { value?: string; value1?: string; image?: string },
        ][];
        for (let i = 0; i < data.colorValues.length; i++) {
          const name = data.colorValues[i];
          for (const [key, entry] of plEntries) {
            let disp: string;
            let img: string | undefined;
            if (typeof entry === "string") {
              disp = entry.includes(":")
                ? (entry.split(":").pop()?.trim() ?? entry)
                : entry.trim();
              img = propsImg?.[key];
            } else if (entry && typeof entry === "object") {
              const raw = String(entry.value ?? entry.value1 ?? "");
              disp = raw.includes(":")
                ? (raw.split(":").pop()?.trim() ?? raw)
                : raw.trim();
              img = entry.image ?? propsImg?.[key];
            } else continue;
            if (disp === name && img) {
              colorImgs[i] = img;
              break;
            }
          }
        }
      }
      data.colorImages = colorImgs;
    }

    await context.close();

    const fabricValues =
      (data as { fabricValues?: string[] }).fabricValues ?? [];
    const fabricGroup: OptionGroup = {
      name: "Fabric",
      values: fabricValues,
      images: [],
    };

    // Filter out packaging/box/accessory options so we don't show non-product thumbnails (e.g. green box images)
    const isPackagingOrAccessory = (value: string): boolean => {
      const v = value.trim().toLowerCase();
      return (
        /礼盒|包装|标配|盒装|收纳|配件|赠品|包装盒|外盒|内盒|盒子|箱/.test(value) ||
        /\b(box|packaging|gift\s*box|case\s*only|accessory|acessório|embalagem|caixa)\b/i.test(v)
      );
    };
    let colorValuesFiltered = data.colorValues.filter((v) => !isPackagingOrAccessory(v));
    // When there are many options, packaging is often at the end; keep at most 15 model options to avoid trailing non-product images
    const MAX_MODEL_OPTIONS = 15;
    if (colorValuesFiltered.length > MAX_MODEL_OPTIONS)
      colorValuesFiltered = colorValuesFiltered.slice(0, MAX_MODEL_OPTIONS);
    const colorImagesFiltered = colorValuesFiltered.map(
      (val) => data.colorImages[data.colorValues.indexOf(val)] ?? "",
    );
    if (colorValuesFiltered.length > 0) {
      data.colorValues = colorValuesFiltered;
      data.colorImages = colorImagesFiltered;
    }

    // Don't show "Tamanho" when we have color/model options and "sizes" are really option IDs (e.g. 10–40 for bags/cases)
    const allNumericSizes = (vals: string[]) =>
      vals.length > 0 && vals.every((v) => /^\d+$/.test(v.trim()));
    const hasLowOptionIds = (vals: string[]) =>
      vals.some((v) => {
        const n = parseInt(v.trim(), 10);
        return !Number.isNaN(n) && n >= 10 && n <= 34;
      });
    const tooManyNumericOptions = (vals: string[]) =>
      vals.length > 8 && allNumericSizes(vals);
    if (data.colorValues.length > 0 && data.sizeValues.length > 0) {
      if (tooManyNumericOptions(data.sizeValues)) {
        data.sizeValues = [];
      } else if (allNumericSizes(data.sizeValues) && hasLowOptionIds(data.sizeValues)) {
        data.sizeValues = [];
      }
    }

    const colorGroup: OptionGroup = {
      name: data.colorValues.length > 0 ? "Cor / Estilo" : "Cor",
      values: data.colorValues.length > 0 ? data.colorValues : [],
      images: data.colorImages.slice(0, data.colorValues.length),
    };

    // Build price per variant (model/color) from SKU list so we match CSSBuy prices per product type
    if (
      propsList &&
      typeof propsList === "object" &&
      skuList.length > 0 &&
      data.colorValues.length > 0
    ) {
      const getEntryRaw = (propKey: string): string => {
        const entry = (propsList as Record<string, unknown>)[propKey];
        if (entry == null) return "";
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object")
          return String(
            (entry as { value?: string }).value ??
              (entry as { value1?: string }).value1 ??
              "",
          );
        return "";
      };
      const priceByValue: Record<string, number> = {};
      for (const sku of skuList) {
        const priceRaw =
          (sku as Record<string, unknown>).price ??
          (sku as Record<string, unknown>).salePrice ??
          (sku as Record<string, unknown>).item_price ??
          (sku as Record<string, unknown>).priceMoney;
        const price =
          typeof priceRaw === "number" && priceRaw > 0
            ? priceRaw
            : typeof priceRaw === "string"
              ? parseFloat(priceRaw)
              : null;
        if (price == null || !Number.isFinite(price)) continue;
        const props = String(
          sku.properties ??
            (sku as Record<string, unknown>).propertiesStr ??
            "",
        );
        const parts = props
          .split(/[;，,]/)
          .map((p) => p.trim())
          .filter(Boolean);
        let colorVal = "";
        for (const part of parts) {
          const raw = getEntryRaw(part);
          if (!raw) continue;
          const colonIdx = raw.indexOf(":");
          const label = colonIdx >= 0 ? raw.slice(0, colonIdx).trim() : "";
          const disp =
            colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw.trim();
          if (!disp || disp.length > 50) continue;
          if (label && isColorLabel(label)) {
            colorVal = disp;
            break;
          }
          if (!/^\d+$/.test(disp) && isSizeLike(disp) === false) {
            colorVal = disp;
            break;
          }
        }
        if (colorVal && !(colorVal in priceByValue)) priceByValue[colorVal] = price;
      }
      if (Object.keys(priceByValue).length > 0)
        colorGroup.priceByValue = priceByValue;
    }

    const sizeGroup: OptionGroup = {
      name: "Tamanho",
      values: data.sizeValues.length > 0 ? data.sizeValues : [],
      images: [],
    };

    if (
      propsList &&
      typeof propsList === "object" &&
      skuList.length > 0 &&
      data.sizeValues.length > 0
    ) {
      const getEntryRaw = (propKey: string): string => {
        const entry = (propsList as Record<string, unknown>)[propKey];
        if (entry == null) return "";
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object")
          return String(
            (entry as { value?: string }).value ??
              (entry as { value1?: string }).value1 ??
              "",
          );
        return "";
      };
      const inventoryByValue: Record<string, number> = {};
      const inventoryByColorAndValue: Record<
        string,
        Record<string, number>
      > = {};
      const hasColor = data.colorValues.length > 0;
      for (const sku of skuList) {
        const props = String(
          sku.properties ??
            (sku as Record<string, unknown>).propertiesStr ??
            "",
        );
        const qty =
          typeof (sku as Record<string, unknown>).quantity === "number"
            ? (sku as { quantity: number }).quantity
            : parseInt(
                String(
                  (sku as Record<string, unknown>).quantity ??
                    (sku as Record<string, unknown>).stock ??
                    0,
                ),
                10,
              ) || 0;
        if (qty < 0) continue;
        const parts = props
          .split(/[;，,]/)
          .map((p) => p.trim())
          .filter(Boolean);
        let colorVal = "";
        let sizeVal = "";
        for (const part of parts) {
          const raw = getEntryRaw(part);
          if (!raw) continue;
          const colonIdx = raw.indexOf(":");
          const label = colonIdx >= 0 ? raw.slice(0, colonIdx).trim() : "";
          const disp =
            colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw.trim();
          if (!disp) continue;
          if (label && isSizeLabel(label)) sizeVal = disp;
          else if (label && isColorLabel(label)) colorVal = disp;
          else if (isSizeLike(disp)) sizeVal = disp;
          else if (!/^\d+$/.test(disp)) colorVal = disp;
        }
        if (!sizeVal) continue;
        if (hasColor && colorVal) {
          if (!inventoryByColorAndValue[colorVal])
            inventoryByColorAndValue[colorVal] = {};
          inventoryByColorAndValue[colorVal][sizeVal] = qty;
        } else {
          inventoryByValue[sizeVal] = qty;
        }
      }
      if (
        Object.keys(inventoryByValue).length > 0 ||
        Object.keys(inventoryByColorAndValue).length > 0
      ) {
        if (Object.keys(inventoryByValue).length > 0)
          sizeGroup.inventoryByValue = inventoryByValue;
        if (hasColor && Object.keys(inventoryByColorAndValue).length > 0) {
          sizeGroup.inventoryByColorAndValue = inventoryByColorAndValue;
          const firstColor = Object.keys(inventoryByColorAndValue)[0];
          if (firstColor && Object.keys(inventoryByValue).length === 0) {
            sizeGroup.inventoryByValue =
              inventoryByColorAndValue[firstColor] ?? {};
          }
        }
      }
    }

    const optionGroups: OptionGroup[] = [];
    if (fabricGroup.values.length > 0) optionGroups.push(fabricGroup);
    if (colorGroup.values.length > 0) optionGroups.push(colorGroup);
    if (sizeGroup.values.length > 0) optionGroups.push(sizeGroup);

    let titlePt: string | null = null;
    if (data.title && data.title.trim().length > 0) {
      titlePt = await translateToPortuguese(data.title);
      if (titlePt === data.title) titlePt = null;
    }
    const displayTitle = titlePt || data.title || null;
    const normalizedPt = displayTitle
      ? normalizeProductTitle(displayTitle)
      : null;

    // Prefer variant (model/color) images as main gallery to avoid showing grid of product+packaging shots
    const mainImages =
      colorGroup.images.length > 0
        ? colorGroup.images.filter(Boolean).slice(0, 40)
        : (data.images || []).slice(0, 12);

    return {
      title: data.title || null,
      titlePt: normalizedPt || titlePt || data.title || null,
      priceCny: data.priceCny ?? null,
      images: mainImages.length > 0 ? mainImages : (data.images || []).slice(0, 12),
      variants: {
        color: colorGroup.values.length ? colorGroup.values : undefined,
        size: sizeGroup.values.length ? sizeGroup.values : undefined,
        colorImages: colorGroup.images.length ? colorGroup.images : undefined,
      },
      optionGroups,
      specs: data.specs || [],
      description: null,
      rawUrl: cssbuyUrl,
    };
  } catch (err) {
    console.error("[cssbuy-scraper] error:", err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
