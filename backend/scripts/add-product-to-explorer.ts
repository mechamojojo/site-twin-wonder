/**
 * Adiciona um produto à página Explorar, usando o scraper para obter título, imagem e preço.
 *
 * Uso (a partir da raiz do projeto):
 *   cd backend && npx ts-node scripts/add-product-to-explorer.ts "https://weidian.com/item.html?itemID=123"
 *
 * Ou com o script npm:
 *   npm run add-product "https://..."
 */

import { getProductPreview } from "../src/scraper/productPreview";
import * as fs from "fs";
import * as path from "path";

const RATE_CNY_TO_BRL = 0.78;
const MARGEM_THRESHOLD_BRL = 60;
const MARGEM_BAIXA_PERCENT = 50;
const MARGEM_ALTA_PERCENT = 35;

function getSourceFromUrl(url: string): "1688" | "Taobao" | "Weidian" | "TMALL" | "JD.com" | "Pinduoduo" | "Goofish" | "Dangdang" | "VIP Shop" {
  const lower = url.toLowerCase();
  // CSSBuy URL path: item-1688-xxx, item-micro-xxx (Weidian), item-taobao-xxx, item-tmall-xxx, etc.
  if (lower.includes("cssbuy") && /\/item-[a-z0-9]+-/.test(url)) {
    const m = url.match(/\/item-(?:micro|1688|taobao|tmall|jd|pinduoduo|vip|dangdang)-/i);
    if (m) {
      const src = m[0].replace(/\/item-|-$/gi, "").toLowerCase();
      if (src === "micro") return "Weidian";
      if (src === "1688") return "1688";
      if (src === "taobao") return "Taobao";
      if (src === "tmall") return "TMALL";
      if (src === "jd") return "JD.com";
      if (src === "pinduoduo") return "Pinduoduo";
      if (src === "vip") return "VIP Shop";
      if (src === "dangdang") return "Dangdang";
    }
  }
  if (lower.includes("1688")) return "1688";
  if (lower.includes("taobao")) return "Taobao";
  if (lower.includes("weidian")) return "Weidian";
  if (lower.includes("tmall")) return "TMALL";
  if (lower.includes("jd.com")) return "JD.com";
  if (lower.includes("pinduoduo")) return "Pinduoduo";
  if (lower.includes("goofish")) return "Goofish";
  if (lower.includes("dangdang")) return "Dangdang";
  if (lower.includes("vip.com") || lower.includes("vipshop")) return "VIP Shop";
  return "1688";
}

function escapeForTsString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

async function addOne(
  url: string,
  featuredPath: string,
  content: string,
  startId: number,
): Promise<{ content: string; nextId: number; title: string }> {
  const preview = await getProductPreview(url);
  if (!preview) throw new Error(`Não foi possível obter os dados do produto: ${url}`);

  const title = (preview.titlePt || preview.title || "Produto").trim().slice(0, 200);
  const image = preview.images?.[0] || undefined;
  const priceCny = preview.priceCny ?? undefined;

  let priceBrl: number | undefined;
  if (priceCny != null && priceCny > 0) {
    const costBrl = priceCny * RATE_CNY_TO_BRL;
    const marginPercent = costBrl < MARGEM_THRESHOLD_BRL ? MARGEM_BAIXA_PERCENT : MARGEM_ALTA_PERCENT;
    priceBrl = Math.round(costBrl * (1 + marginPercent / 100) * 100) / 100;
  }

  const source = getSourceFromUrl(url);
  const imageLine = image ? `    image: "${escapeForTsString(image)}",` : "";
  const priceBrlLine = priceBrl != null ? `    priceBrl: ${priceBrl},` : "";
  const priceCnyLine = priceCny != null ? `    priceCny: ${priceCny},` : "";

  const newEntry = `
  {
    id: "${startId}",
    url: "${escapeForTsString(url)}",
    title: "${escapeForTsString(title)}",
${imageLine}
${priceBrlLine}
${priceCnyLine}
    category: "destaques",
    source: "${source}",
  },`;

  const insertAt = content.lastIndexOf("];");
  const contentNew = content.slice(0, insertAt) + newEntry + "\n" + content.slice(insertAt);
  return { content: contentNew, nextId: startId + 1, title };
}

async function main() {
  const urls = process.argv.slice(2).map((u) => u?.trim()).filter((u) => u && (u.startsWith("http://") || u.startsWith("https://")));
  if (urls.length === 0) {
    console.error("Uso: npx ts-node scripts/add-product-to-explorer.ts \"<URL1>\" [\"<URL2>\" ...]");
    process.exit(1);
  }

  const featuredPath = path.join(__dirname, "../../src/data/featuredProducts.ts");
  let content = fs.readFileSync(featuredPath, "utf-8");
  const idMatch = content.match(/id:\s*"(\d+)"/g);
  let nextId = idMatch
    ? Math.max(...idMatch.map((m) => parseInt(m.match(/"(\d+)"/)![1], 10))) + 1
    : 1;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Scraping ${url.slice(0, 60)}...`);
    try {
      const result = await addOne(url, featuredPath, content, nextId);
      content = result.content;
      nextId = result.nextId;
      console.log("  OK:", result.title.slice(0, 50));
    } catch (err) {
      console.error("  ERRO:", err instanceof Error ? err.message : err);
    }
  }

  fs.writeFileSync(featuredPath, content, "utf-8");
  console.log("\nProdutos salvos em src/data/featuredProducts.ts");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
