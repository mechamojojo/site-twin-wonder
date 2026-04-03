/**
 * Re-scrape cada produto em destaque e atualiza título e imagem no featuredProducts.ts.
 * Garante que cada link tenha o título e a imagem corretos do próprio produto.
 *
 * Uso: cd backend && npm run update-featured-products
 */

import { getProductPreview } from "../src/scraper/productPreview";
import * as fs from "fs";
import * as path from "path";

const FEATURED_PATH = path.join(__dirname, "../../src/data/featuredProducts.ts");

const RATE_CNY_TO_BRL = 0.81;
const MARGEM_THRESHOLD_BRL = 60;
const MARGEM_BAIXA_PERCENT = 50;
const MARGEM_ALTA_PERCENT = 35;

function getSourceFromUrl(url: string): string {
  const host = url.toLowerCase();
  if (host.includes("1688")) return "1688";
  if (host.includes("taobao")) return "Taobao";
  if (host.includes("weidian")) return "Weidian";
  if (host.includes("tmall")) return "TMALL";
  if (host.includes("jd.com")) return "JD.com";
  if (host.includes("pinduoduo")) return "Pinduoduo";
  if (host.includes("goofish")) return "Goofish";
  if (host.includes("dangdang")) return "Dangdang";
  if (host.includes("vip.com") || host.includes("vipshop")) return "VIP Shop";
  return "1688";
}

function escapeForTsString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

interface ProductBlock {
  id: string;
  url: string;
  title: string;
  image?: string;
  priceBrl?: number;
  priceCny?: number;
  category: string;
  source: string;
  rawBlock: string;
}

function parseProductBlocks(content: string): ProductBlock[] {
  const blocks: ProductBlock[] = [];
  const blockRegex = /\{\s*id:\s*"([^"]+)",\s*url:\s*"([^"]*(?:\\.[^"]*)*)",\s*title:\s*"([^"]*(?:\\.[^"]*)*)",([^}]*)\}/gs;
  let m;
  while ((m = blockRegex.exec(content)) !== null) {
    const rest = m[4];
    const imageMatch = rest.match(/image:\s*"([^"]*(?:\\.[^"]*)*)"/);
    const priceBrlMatch = rest.match(/priceBrl:\s*([\d.]+)/);
    const priceCnyMatch = rest.match(/priceCny:\s*([\d.]+)/);
    const categoryMatch = rest.match(/category:\s*"([^"]+)"/);
    const sourceMatch = rest.match(/source:\s*"([^"]+)"/);
    blocks.push({
      id: m[1],
      url: m[2].replace(/\\"/g, '"'),
      title: m[3].replace(/\\"/g, '"'),
      image: imageMatch ? imageMatch[1].replace(/\\"/g, '"') : undefined,
      priceBrl: priceBrlMatch ? parseFloat(priceBrlMatch[1]) : undefined,
      priceCny: priceCnyMatch ? parseFloat(priceCnyMatch[1]) : undefined,
      category: categoryMatch?.[1] ?? "destaques",
      source: sourceMatch?.[1] ?? "Weidian",
      rawBlock: m[0],
    });
  }
  return blocks;
}

async function main() {
  let content = fs.readFileSync(FEATURED_PATH, "utf-8");

  // Match products inside the array - handle multiline and comments
  const arrayStart = content.indexOf("export const FEATURED_PRODUCTS: FeaturedProduct[] = [");
  const arrayContent = content.slice(arrayStart);
  const products: ProductBlock[] = [];

  const blockPattern = /\{\s*id:\s*"([^"]+)",\s*url:\s*"((?:[^"\\]|\\.)*)",\s*title:\s*"((?:[^"\\]|\\.)*)"([^}]+)\}/gs;
  let match;
  while ((match = blockPattern.exec(arrayContent)) !== null) {
    const rest = match[4];
    const imageMatch = rest.match(/image:\s*"((?:[^"\\]|\\.)*)"/);
    const priceBrlMatch = rest.match(/priceBrl:\s*([\d.]+)/);
    const priceCnyMatch = rest.match(/priceCny:\s*([\d.]+)/);
    const categoryMatch = rest.match(/category:\s*"([^"]+)"/);
    const sourceMatch = rest.match(/source:\s*"([^"]+)"/);

    const url = match[2].replace(/\\"/g, '"');
    const title = match[3].replace(/\\"/g, '"');

    products.push({
      id: match[1],
      url,
      title,
      image: imageMatch ? imageMatch[1].replace(/\\"/g, '"') : undefined,
      priceBrl: priceBrlMatch ? parseFloat(priceBrlMatch[1]) : undefined,
      priceCny: priceCnyMatch ? parseFloat(priceCnyMatch[1]) : undefined,
      category: categoryMatch?.[1] ?? "destaques",
      source: sourceMatch?.[1] ?? getSourceFromUrl(url),
      rawBlock: match[0],
    });
  }

  if (products.length === 0) {
    console.error("Nenhum produto encontrado em featuredProducts.ts");
    process.exit(1);
  }

  console.log(`Encontrados ${products.length} produtos. Re-scraping cada URL...\n`);

  const updated: { id: string; title: string; image?: string; priceCny?: number; priceBrl?: number }[] = [];

  for (const p of products) {
    console.log(`[${p.id}] Scraping ${p.url.slice(0, 60)}...`);
    try {
      const preview = await getProductPreview(p.url);
      if (!preview) {
        console.log(`  → Falhou, mantendo dados atuais`);
        updated.push({ id: p.id, title: p.title, image: p.image, priceCny: p.priceCny, priceBrl: p.priceBrl });
        continue;
      }

      let newTitle = (preview.titlePt || preview.title || p.title).trim().slice(0, 200);
      // For store/personal pages, always use manual title (not a single product)
      const storeTitles: Record<string, string> = { "goofish-store": "Loja Goofish (闲鱼) — marketplace de usados" };
      if (storeTitles[p.id]) newTitle = storeTitles[p.id];
      const newImage = preview.images?.[0];
      // Don't set price for store/personal pages (not a single product)
      const isStorePage = p.url.includes("goofish.com/personal") || p.id === "goofish-store";
      const newPriceCny = isStorePage ? undefined : (preview.priceCny ?? p.priceCny);

      let newPriceBrl = isStorePage ? undefined : p.priceBrl;
      if (!isStorePage && newPriceCny != null && newPriceCny > 0) {
        const costBrl = newPriceCny * RATE_CNY_TO_BRL;
        const marginPercent = costBrl < MARGEM_THRESHOLD_BRL ? MARGEM_BAIXA_PERCENT : MARGEM_ALTA_PERCENT;
        newPriceBrl = Math.round(costBrl * (1 + marginPercent / 100) * 100) / 100;
      }

      updated.push({
        id: p.id,
        title: newTitle,
        image: newImage,
        priceCny: newPriceCny,
        priceBrl: newPriceBrl,
      });
      console.log(`  → Título: ${newTitle.slice(0, 50)}...`);
      console.log(`  → Imagem: ${newImage ? "sim" : "não"}`);
    } catch (err) {
      console.log(`  → Erro: ${(err as Error).message}, mantendo dados atuais`);
      updated.push({ id: p.id, title: p.title, image: p.image, priceCny: p.priceCny, priceBrl: p.priceBrl });
    }
  }

  // Rebuild the file
  const beforeArray = content.slice(0, content.indexOf("export const FEATURED_PRODUCTS: FeaturedProduct[] = [") + "export const FEATURED_PRODUCTS: FeaturedProduct[] = [".length);
  const afterArray = content.slice(content.lastIndexOf("];"));
  const insertComment = "  // Adicione mais itens abaixo. Use category: \"mais-vendidos\" ou \"tendencias\" quando quiser.\n";

  const entries: string[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const u = updated[i];
    const imageLine = u.image ? `    image: "${escapeForTsString(u.image)}",` : "";
    const priceBrlLine = u.priceBrl != null ? `    priceBrl: ${u.priceBrl},` : "";
    const priceCnyLine = u.priceCny != null ? `    priceCny: ${u.priceCny},` : "";

    let block = `  {
    id: "${p.id}",
    url: "${escapeForTsString(p.url)}",
    title: "${escapeForTsString(u.title)}",
`;
    if (imageLine) block += imageLine + "\n";
    if (priceBrlLine) block += priceBrlLine + "\n";
    if (priceCnyLine) block += priceCnyLine + "\n";
    block += `    category: "${p.category}",
    source: "${getSourceFromUrl(p.url)}",
  }`;
    entries.push(block);
  }

  const newContent = beforeArray + "\n" + entries.join(",\n") + ",\n" + insertComment + afterArray;
  fs.writeFileSync(FEATURED_PATH, newContent, "utf-8");

  console.log("\n✓ featuredProducts.ts atualizado com títulos e imagens do scraper.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
