/**
 * rename-products-by-image.mjs
 *
 * Analyzes each product image with Claude Vision and rewrites the titles
 * in both featuredProducts.ts and explorarProducts.ts with accurate,
 * marketplace-style Portuguese names.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/rename-products-by-image.mjs
 *
 * Flags:
 *   --dry-run     Print suggested names without writing to files
 *   --only=feat   Only process featuredProducts.ts
 *   --only=explo  Only process explorarProducts.ts (fetches pages to get images)
 *
 * Requirements:
 *   npm install @anthropic-ai/sdk   (or: bun add @anthropic-ai/sdk)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const DELAY_MS = 800; // polite delay between API calls

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch image bytes and return as base64.
 * Tries to detect media type from URL extension.
 */
async function fetchImageBase64(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://weidian.com/",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
  const mediaType =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
  return { base64: Buffer.from(buf).toString("base64"), mediaType };
}

/**
 * Ask Claude to generate a clean marketplace title in Brazilian Portuguese.
 * Returns the title string, or null on failure.
 */
async function generateTitleFromImage(imageUrl, currentTitle, hint = "") {
  let imageSource;
  try {
    const { base64, mediaType } = await fetchImageBase64(imageUrl);
    imageSource = { type: "base64", media_type: mediaType, data: base64 };
  } catch (err) {
    console.warn(`  ⚠ Could not fetch image (${err.message}) — skipping`);
    return null;
  }

  const systemPrompt = `You are a Brazilian e-commerce copywriter specializing in naming products for marketplaces like Shopee, Mercado Livre, and Amazon Brasil.
Your task: look at the product image and write ONE concise product title in Brazilian Portuguese.

Rules:
- NO brand names (Nike, Adidas, Apple, Samsung, Louis Vuitton, Gucci, etc.)
- NO model numbers or internal codes (e.g. "M9060", "B585", "J4")
- Pattern: [Category] [Material/Style] [Gender if relevant] [Key Feature(s)]
- 4–8 words maximum
- Title case (Capitalize Each Important Word)
- Language: Brazilian Portuguese only
- Be specific — describe what you actually see (color, material, silhouette, unique details)

Good examples:
- "Tênis Chunky Masculino Solado Grosso Branco"
- "Bolsa Tote Couro Sintético Feminina Caramelo"
- "Jaqueta Corta-Vento Refletiva Unissex Preta"
- "Relógio Masculino Automático Mostrador Azul"
- "Óculos de Sol Cat Eye Dourado Feminino"

Return ONLY the title, nothing else.`;

  const userContent = [
    {
      type: "image",
      source: imageSource,
    },
    {
      type: "text",
      text: `Generate a marketplace title for this product.${hint ? ` Context: ${hint}` : ""}${currentTitle ? ` (current title for reference: "${currentTitle}")` : ""}`,
    },
  ];

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 60,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    const text = msg.content[0]?.text?.trim();
    return text || null;
  } catch (err) {
    console.warn(`  ⚠ API error: ${err.message}`);
    return null;
  }
}

// ─── featuredProducts.ts processing ─────────────────────────────────────────

const PLACEHOLDER_IMAGE =
  "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png";

async function processFeaturedProducts() {
  const filePath = path.join(ROOT, "src/data/featuredProducts.ts");
  let source = fs.readFileSync(filePath, "utf8");

  // Extract all products with a real image
  const productRegex =
    /\{\s*id:\s*"(\d+)"[^}]*?title:\s*"([^"]*)"[^}]*?image:\s*"([^"]*)"[^}]*?\}/gs;

  const products = [];
  let match;
  while ((match = productRegex.exec(source)) !== null) {
    const [full, id, title, image] = match;
    if (image && image !== PLACEHOLDER_IMAGE && !image.includes("TB1nmqy")) {
      products.push({ id, title, image, full });
    }
  }

  console.log(
    `\n📦 featuredProducts.ts — found ${products.length} products with real images\n`
  );

  const replacements = [];

  for (const p of products) {
    process.stdout.write(`  [${p.id}] ${p.title.slice(0, 45).padEnd(46)} → `);
    const newTitle = await generateTitleFromImage(p.image, p.title);
    if (newTitle && newTitle !== p.title) {
      console.log(`"${newTitle}"`);
      replacements.push({ old: p.title, new: newTitle });
    } else if (!newTitle) {
      console.log("(skipped)");
    } else {
      console.log("(unchanged)");
    }
    await sleep(DELAY_MS);
  }

  if (!DRY_RUN && replacements.length > 0) {
    let updated = source;
    for (const r of replacements) {
      // Replace title: "old" → title: "new"  (exact match)
      updated = updated.replace(
        new RegExp(`(title:\\s*)"${escapeRegex(r.old)}"`, "g"),
        `$1"${r.new}"`
      );
    }
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`\n✅ Wrote ${replacements.length} updated titles to ${filePath}`);
  } else if (DRY_RUN) {
    console.log("\n(dry-run — no files written)");
  } else {
    console.log("\nNo changes needed.");
  }
}

// ─── explorarProducts.ts processing ─────────────────────────────────────────

/**
 * Attempt to extract an image URL from a Weidian product page.
 * Falls back to null if the page is inaccessible.
 */
async function getWeidianImage(itemUrl) {
  try {
    const res = await fetch(itemUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Look for og:image or first product CDN image
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    if (ogMatch) return ogMatch[1];
    const imgMatch = html.match(/https?:\/\/[^"']*(?:geilicdn|alicdn)[^"']*\.(?:jpg|png|jpeg|webp)/);
    return imgMatch ? imgMatch[0] : null;
  } catch {
    return null;
  }
}

async function processExplorarProducts() {
  const filePath = path.join(ROOT, "src/data/explorarProducts.ts");
  let source = fs.readFileSync(filePath, "utf8");

  // Parse RAW array entries
  const rawRegex =
    /\{\s*url:\s*"([^"]+)"[^}]*?titlePt:\s*"([^"]+)"[^}]*?priceCny:[^,}]+,\s*category:\s*"([^"]+)"\s*\}/g;

  const products = [];
  let match;
  while ((match = rawRegex.exec(source)) !== null) {
    const [full, url, titlePt, category] = match;
    products.push({ url, titlePt, category });
  }

  console.log(
    `\n📦 explorarProducts.ts — found ${products.length} RAW products (will fetch pages for images)\n`
  );

  const replacements = [];

  for (const p of products) {
    process.stdout.write(`  ${p.titlePt.slice(0, 45).padEnd(46)} → `);

    const imageUrl = await getWeidianImage(p.url);
    if (!imageUrl) {
      console.log("(no image found)");
      await sleep(200);
      continue;
    }

    const newTitle = await generateTitleFromImage(
      imageUrl,
      p.titlePt,
      `category: ${p.category}`
    );

    if (newTitle && newTitle !== p.titlePt) {
      console.log(`"${newTitle}"`);
      replacements.push({ old: p.titlePt, new: newTitle });
    } else if (!newTitle) {
      console.log("(skipped)");
    } else {
      console.log("(unchanged)");
    }
    await sleep(DELAY_MS);
  }

  if (!DRY_RUN && replacements.length > 0) {
    let updated = source;
    for (const r of replacements) {
      updated = updated.replace(
        new RegExp(`(titlePt:\\s*)"${escapeRegex(r.old)}"`, "g"),
        `$1"${r.new}"`
      );
    }
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`\n✅ Wrote ${replacements.length} updated titles to ${filePath}`);
  } else if (DRY_RUN) {
    console.log("\n(dry-run — no files written)");
  } else {
    console.log("\nNo changes needed.");
  }
}

// ─── Escape helper ────────────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "❌  ANTHROPIC_API_KEY is not set.\n" +
    "    Export it before running:\n" +
    "    ANTHROPIC_API_KEY=sk-ant-... node scripts/rename-products-by-image.mjs"
  );
  process.exit(1);
}

console.log(`🔍 rename-products-by-image${DRY_RUN ? " [DRY RUN]" : ""}`);
console.log("─".repeat(60));

if (!ONLY || ONLY === "feat") await processFeaturedProducts();
if (!ONLY || ONLY === "explo") await processExplorarProducts();

console.log("\n🎉 Done.");
