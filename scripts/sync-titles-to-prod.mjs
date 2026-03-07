/**
 * sync-titles-to-prod.mjs
 * ─────────────────────────────────────────────────────────────
 * Exporta todos os títulos do banco LOCAL e aplica no banco de
 * PRODUÇÃO (Railway) via API.
 *
 * Pré-requisitos (rodar no Mac, dentro da pasta do projeto):
 *   1. Docker com o banco local rodando  (docker compose up -d)
 *   2. Backend local rodando             (npm run dev  dentro de /backend)
 *   3. PROD_API_URL apontando para o Railway
 *
 * Uso:
 *   PROD_API_URL=https://seu-backend.railway.app \
 *   ADMIN_SECRET=sua_senha_admin \
 *   node scripts/sync-titles-to-prod.mjs
 *
 * Variáveis de ambiente:
 *   LOCAL_API_URL    – URL do backend local     (padrão: http://localhost:4000)
 *   PROD_API_URL     – URL do backend produção  (obrigatório)
 *   LOCAL_ADMIN_SECRET – Senha do admin no backend LOCAL (para buscar produtos)
 *   PROD_ADMIN_SECRET  – Senha do admin no backend PRODUÇÃO (para enviar títulos)
 *   Se não definir LOCAL_ ou PROD_, usa ADMIN_SECRET para ambos (padrão: compraschina)
 */

const LOCAL_API = process.env.LOCAL_API_URL ?? "http://localhost:4000";
const PROD_API  = process.env.PROD_API_URL;
const LOCAL_SECRET = process.env.LOCAL_ADMIN_SECRET ?? process.env.ADMIN_SECRET ?? "compraschina";
const PROD_SECRET  = process.env.PROD_ADMIN_SECRET ?? process.env.ADMIN_SECRET ?? "compraschina";

if (!PROD_API) {
  console.error("❌  Defina a variável PROD_API_URL antes de rodar.");
  console.error("    Exemplo:");
  console.error("    PROD_API_URL=https://seu-backend.railway.app node scripts/sync-titles-to-prod.mjs");
  process.exit(1);
}

async function getAdminToken(baseUrl, password) {
  const res = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

// ── 0. Obter tokens de admin (local e prod) ───────────────────
console.log("🔐  Fazendo login no backend LOCAL...");
let localToken;
try {
  localToken = await getAdminToken(LOCAL_API, LOCAL_SECRET);
  console.log("✅  Login local OK.\n");
} catch (e) {
  console.error("❌  Falha no login local:", e.message);
  process.exit(1);
}

// ── 1. Buscar todos os produtos do banco local ─────────────────
console.log("📦  Buscando produtos do banco LOCAL...");

let page = 1;
const PAGE = 200;
const allProducts = [];

while (true) {
  const res = await fetch(
    `${LOCAL_API}/api/admin/products?limit=${PAGE}&offset=${(page - 1) * PAGE}`,
    { headers: { "x-admin-token": localToken } }
  );
  if (!res.ok) {
    console.error("❌  Falha ao buscar produtos locais:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.products ?? data.data ?? []);
  if (list.length === 0) break;
  allProducts.push(...list);
  if (list.length < PAGE) break;
  page++;
}

console.log(`✅  ${allProducts.length} produtos encontrados no banco local.\n`);

if (allProducts.length === 0) {
  console.log("⚠️  Nenhum produto encontrado. Certifique-se que o backend local está rodando.");
  process.exit(0);
}

// ── 2. Montar payload { slug, title, titlePt } ──────────────────
const payload = allProducts
  .filter((p) => p.slug && p.title)
  .map((p) => ({
    slug: p.slug,
    title: p.title,
    titlePt: p.titlePt ?? p.title,
  }));

console.log(`📝  Enviando ${payload.length} títulos para PRODUÇÃO (${PROD_API})...\n`);

// ── 2b. Login no prod ──────────────────────────────────────────
console.log("🔐  Fazendo login no backend de PRODUÇÃO...");
let prodToken;
try {
  prodToken = await getAdminToken(PROD_API, PROD_SECRET);
  console.log("✅  Login produção OK.\n");
} catch (e) {
  console.error("❌  Falha no login em produção:", e.message);
  console.error("    Verifique PROD_API_URL e PROD_ADMIN_SECRET (senha do admin em produção).");
  process.exit(1);
}

// ── 3. Enviar para o backend de produção ───────────────────────
// Envia em lotes de 100 para não sobrecarregar
const BATCH = 100;
let totalUpdated = 0;
let totalNotFound = 0;
const allErrors = [];

for (let i = 0; i < payload.length; i += BATCH) {
  const batch = payload.slice(i, i + BATCH);
  const batchNum = Math.floor(i / BATCH) + 1;
  const totalBatches = Math.ceil(payload.length / BATCH);
  process.stdout.write(`  Lote ${batchNum}/${totalBatches} (${batch.length} produtos)... `);

  const res = await fetch(`${PROD_API}/api/admin/products/bulk-update-titles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": prodToken,
    },
    body: JSON.stringify({ products: batch }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`\n❌  Erro no lote ${batchNum}:`, res.status, text);
    allErrors.push(`Lote ${batchNum}: ${text}`);
    continue;
  }

  const result = await res.json();
  totalUpdated  += result.updated  ?? 0;
  totalNotFound += result.notFound ?? 0;
  if (result.errors?.length) allErrors.push(...result.errors);

  console.log(`✅  ${result.updated} atualizados, ${result.notFound} não encontrados`);
}

// ── 4. Resumo ─────────────────────────────────────────────────
console.log("\n══════════════════════════════════════");
console.log(`✅  Atualizados:   ${totalUpdated}`);
console.log(`⚠️   Não encontrados: ${totalNotFound}  (produtos que existem só no local)`);
if (allErrors.length) {
  console.log(`❌  Erros:         ${allErrors.length}`);
  allErrors.forEach((e) => console.log("   •", e));
}
console.log("══════════════════════════════════════\n");

if (totalUpdated > 0) {
  console.log("🎉  Sincronização concluída! Abra o site em produção para confirmar.");
} else {
  console.log("💡  Nenhum produto foi atualizado.");
  console.log("    Verifique se os slugs do banco local batem com os do banco de produção.");
  console.log("    Se os produtos de produção foram importados de forma diferente,");
  console.log("    use o Admin do site em produção para editar manualmente.");
}
