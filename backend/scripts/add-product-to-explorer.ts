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

const RATE_CNY_TO_BRL = 0.75;
const MARGEM_THRESHOLD_BRL = 40;
const MARGEM_BAIXA_PERCENT = 35;
const MARGEM_ALTA_PERCENT = 25;

function getSourceFromUrl(url: string): "1688" | "Taobao" | "Weidian" | "TMALL" | "JD.com" | "Pinduoduo" | "Goofish" | "Dangdang" | "VIP Shop" {
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

async function main() {
  const url = process.argv[2]?.trim();
  if (!url) {
    console.error("Uso: npx ts-node scripts/add-product-to-explorer.ts \"<URL do produto>\"");
    process.exit(1);
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.error("URL deve começar com http:// ou https://");
    process.exit(1);
  }

  console.log("Scraping", url, "...");
  const preview = await getProductPreview(url);
  if (!preview) {
    console.error("Não foi possível obter os dados do produto. Tente novamente mais tarde.");
    process.exit(1);
  }

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

  const featuredPath = path.join(__dirname, "../../src/data/featuredProducts.ts");
  let content = fs.readFileSync(featuredPath, "utf-8");

  const idMatch = content.match(/id:\s*"(\d+)"/g);
  const nextId = idMatch
    ? String(Math.max(...idMatch.map((m) => parseInt(m.match(/"(\d+)"/)![1], 10))) + 1)
    : "1";

  const imageLine = image ? `    image: "${escapeForTsString(image)}",` : "";
  const priceBrlLine = priceBrl != null ? `    priceBrl: ${priceBrl},` : "";
  const priceCnyLine = priceCny != null ? `    priceCny: ${priceCny},` : "";

  const newEntry = `
  {
    id: "${nextId}",
    url: "${escapeForTsString(url)}",
    title: "${escapeForTsString(title)}",
${imageLine}
${priceBrlLine}
${priceCnyLine}
    category: "destaques",
    source: "${source}",
  },`;

  const commentIdx = content.indexOf("  // Adicione mais itens abaixo");
  const insertAt = commentIdx !== -1 ? commentIdx : content.lastIndexOf("];");

  content = content.slice(0, insertAt) + newEntry + "\n" + content.slice(insertAt);

  fs.writeFileSync(featuredPath, content, "utf-8");
  console.log("Produto adicionado ao Explorar:");
  console.log("  Título:", title);
  console.log("  Imagem:", image ? "sim" : "não");
  console.log("  Preço:", priceBrl != null ? `R$ ${priceBrl.toFixed(2)}` : priceCny != null ? `CNY ¥ ${priceCny}` : "—");
  console.log("  ID:", nextId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
