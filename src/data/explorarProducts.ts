/**
 * Lista de produtos do Explorar / "Produtos que você pode comprar".
 * Se existir explorarProducts.export.json com itens (gerado pelo Admin), ele é usado — assim o que
 * você edita no Admin (imagem de preview, títulos, etc.) fica no código e vai para produção.
 * Para exportar após editar no Admin: cd backend && npm run export-explorar-to-code
 * Depois: commitar src/data/explorarProducts.export.json
 */
import exportedFromAdmin from "./explorarProducts.export.json";

const RATE_CNY = 0.75;

function priceBrl(priceCny: number | null): number | null {
  if (priceCny == null || priceCny <= 0) return null;
  const costBrl = priceCny * RATE_CNY;
  const margin = costBrl < 40 ? 0.35 : 0.25;
  return Math.round(costBrl * (1 + margin) * 100) / 100;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80) || "produto";
}

function itemId(url: string): string {
  const m = url.match(/itemID=(\d+)/);
  return m ? m[1] : url;
}

export type ExplorarProduct = {
  id: string;
  url: string;
  title: string;
  titlePt: string;
  image?: string | null;
  priceCny: number | null;
  priceBrl: number | null;
  category: string;
  source: string;
  slug: string;
};

const RAW: { url: string; titlePt: string; priceCny: number | null; category: string }[] = [
  { url: "https://weidian.com/item.html?itemID=7392755626", titlePt: "Casaco térmico inverno esportivo 1014", priceCny: 289, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7389113468", titlePt: "Modelo A-3 P2-0102", priceCny: 55, category: "outros" },
  { url: "https://weidian.com/item.html?itemID=7388235958", titlePt: "Tênis Reebok 4 retro", priceCny: 250, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7386577527", titlePt: "Tênis 2024 4S Retro Sneakers", priceCny: 280, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7388498976", titlePt: "Tênis M 9060 casual", priceCny: 280, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7399162790", titlePt: "Relógio masculino qualidade premium", priceCny: 380, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7387922746", titlePt: "Tênis UG 2021", priceCny: 270, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7626154952", titlePt: "iPhone 17 Pro Max 512GB", priceCny: 1299, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7392316254", titlePt: "Bolsa fashion unissex", priceCny: 69, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7626225818", titlePt: "AirPods 4 com case USB-C", priceCny: 119, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7386330489", titlePt: "Tênis casal esportivo casual", priceCny: 520, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7569991217", titlePt: "Jaqueta corta-vento curta brilhante", priceCny: 960, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7426164888", titlePt: "Jaqueta down jacket", priceCny: 280, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7624160803", titlePt: "AirPods Max USB-C", priceCny: 699, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7534086600", titlePt: "Tênis infantil LYWD couro", priceCny: 258, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7571968062", titlePt: "Bota coturno clássica 1AX", priceCny: 270, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7632728799", titlePt: "Apple Pencil 2ª geração", priceCny: 298, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7623936288", titlePt: "AirPods Pro 3ª geração MagSafe USB-C", priceCny: 129, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7542699356", titlePt: "Tênis basquete J4 antiderrapante", priceCny: 888, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7571961944", titlePt: "Botas curtas couro", priceCny: 228, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7556952783", titlePt: "Calça jeans PU cropped com strass", priceCny: 348, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7388734828", titlePt: "Calça jeans PULL variedade", priceCny: 238, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7386662157", titlePt: "Tênis Face1 Low XQ", priceCny: 120, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7566796357", titlePt: "Casaco longo com capuz premium", priceCny: 590, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7428474671", titlePt: "Camiseta B585", priceCny: 99, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7570022623", titlePt: "Casaco x219 corta-vento", priceCny: 1300, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7402520780", titlePt: "Camiseta Godspe verão", priceCny: 118, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7572611824", titlePt: "Colete grosso fashion", priceCny: 236, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7576909422", titlePt: "Camiseta Corteiz 5 anos", priceCny: 160, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7421534661", titlePt: "Tênis plataforma casual", priceCny: 420, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7392935064", titlePt: "Óculos de sol chat UV", priceCny: 230, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7388253928", titlePt: "Tênis fashion", priceCny: 480, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7390473789", titlePt: "Bolsa 1014 all-in-one", priceCny: 59, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7418314380", titlePt: "Tênis Vaporwaffle casual", priceCny: 270, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7393295696", titlePt: "Perfume 100ml masculino", priceCny: 108, category: "beleza" },
  { url: "https://weidian.com/item.html?itemID=7391267669", titlePt: "Pulseira 5A cubic zircônia", priceCny: 90, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7392304288", titlePt: "Bolsa L fashion K4", priceCny: 385, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7387308437", titlePt: "Controle 2021 P&S 5", priceCny: 520, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7400912230", titlePt: "Relógio masculino premium", priceCny: 1288, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7400896120", titlePt: "Fone TOPultra 07", priceCny: 245, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7400882622", titlePt: "Relógio automático clássico", priceCny: 1688, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7399176632", titlePt: "Relógio 132415", priceCny: 308, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7515649491", titlePt: "Tênis casual placa", priceCny: 369, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7494600429", titlePt: "Moletom esportivo feminino manga longa", priceCny: 120, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7424577749", titlePt: "Sandália/chinelo unissex", priceCny: 118, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7425303732", titlePt: "Mala de viagem addTravel", priceCny: 199, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7395989993", titlePt: "Camiseta futebol S manga curta", priceCny: 79, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7424638812", titlePt: "Tênis esportivo confortável", priceCny: 260, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7386307133", titlePt: "Tênis OG casual", priceCny: 240, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7425201304", titlePt: "Anel ajustável com strass", priceCny: 88, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7464669388", titlePt: "D*S HD07", priceCny: 545, category: "eletronicos" },
  { url: "https://weidian.com/item.html?itemID=7424613442", titlePt: "Produto Weidian", priceCny: null, category: "outros" },
  { url: "https://weidian.com/item.html?itemID=7464717164", titlePt: "Relógio automático masculino data dual time", priceCny: 2680, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7432952811", titlePt: "Maiô fashion", priceCny: 139, category: "moda" },
  { url: "https://weidian.com/item.html?itemID=7423321207", titlePt: "Bolsa feminina quadrada minimalista", priceCny: 136, category: "acessorios" },
  { url: "https://weidian.com/item.html?itemID=7464711086", titlePt: "Relógio Hermès S8 1:1", priceCny: 460, category: "acessorios" },
];

const slugCount = new Map<string, number>();
function uniqueSlug(titlePt: string): string {
  const base = slugify(titlePt);
  const n = (slugCount.get(base) ?? 0) + 1;
  slugCount.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

const BUILT_IN: ExplorarProduct[] = RAW.map((r) => ({
  id: itemId(r.url),
  url: r.url,
  title: r.titlePt,
  titlePt: r.titlePt,
  image: null,
  priceCny: r.priceCny,
  priceBrl: priceBrl(r.priceCny),
  category: r.category,
  source: "Weidian",
  slug: uniqueSlug(r.titlePt),
}));

const exported = exportedFromAdmin as ExplorarProduct[];

/** Lista de produtos: usa a exportação do Admin se houver; senão usa a lista embutida. */
export const EXPLORAR_PRODUCTS: ExplorarProduct[] =
  Array.isArray(exported) && exported.length > 0 ? exported : BUILT_IN;
