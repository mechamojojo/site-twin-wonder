/**
 * Lista de produtos do Explorar / "Produtos que você pode comprar".
 * Inclui: export do Admin (ou lista embutida) + FEATURED_PRODUCTS (produtos adicionados com npm run add-product).
 * Para exportar após editar no Admin: cd backend && npm run export-explorar-to-code
 */
import exportedFromAdmin from "./explorarProducts.export.json";
import { FEATURED_PRODUCTS } from "./featuredProducts";
import { productUrlToCanonicalKey } from "@/lib/utils";
import { priceCnyToBrl } from "@/lib/pricing";

function priceBrl(priceCny: number | null): number | null {
  if (priceCny == null || priceCny <= 0) return null;
  return priceCnyToBrl(priceCny);
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 80) || "produto"
  );
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
  /** Nome da marca (marcas originais chinesas) */
  brand?: string;
  /** Nome da loja (ex.: loja oficial no Taobao) */
  storeName?: string;
  /** Produto de marca chinesa — badge "Marca chinesa" */
  isChineseBrand?: boolean;
};

const RAW: {
  url: string;
  titlePt: string;
  priceCny: number | null;
  category: string;
}[] = [
  {
    url: "https://weidian.com/item.html?itemID=7392755626",
    titlePt: "Casaco Térmico Esportivo de Inverno com Zíper",
    priceCny: 289,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7389113468",
    titlePt: "Acessório Esportivo Compacto",
    priceCny: 55,
    category: "outros",
  },
  {
    url: "https://weidian.com/item.html?itemID=7388235958",
    titlePt: "Tênis Retro Clássico Baixo com Detalhes Coloridos",
    priceCny: 250,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7386577527",
    titlePt: "Tênis Retro 4 Tiras Solado Grosso",
    priceCny: 280,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7388498976",
    titlePt: "Tênis Chunky Casual Moderno",
    priceCny: 280,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7399162790",
    titlePt: "Relógio Masculino Esportivo Multifunção Cronômetro",
    priceCny: 380,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7387922746",
    titlePt: "Tênis Esportivo Casual Confortável",
    priceCny: 270,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7626154952",
    titlePt: "Smartphone Pro Max 512GB Câmera Avançada",
    priceCny: 1299,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7392316254",
    titlePt: "Bolsa Crossbody Unissex Fashion",
    priceCny: 69,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7626225818",
    titlePt: "Fone TWS com Estojo de Carregamento USB-C",
    priceCny: 119,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7386330489",
    titlePt: "Tênis Esportivo Casual para Casal",
    priceCny: 520,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7569991217",
    titlePt: "Jaqueta Corta-Vento Curta Brilhante",
    priceCny: 960,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7426164888",
    titlePt: "Jaqueta Pluma Quente e Leve",
    priceCny: 280,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7624160803",
    titlePt: "Headphone Over-Ear Cancelamento de Ruído USB-C",
    priceCny: 699,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7534086600",
    titlePt: "Tênis Infantil Couro Estilo Clássico",
    priceCny: 258,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7571968062",
    titlePt: "Bota Coturno Clássica Couro Sintético",
    priceCny: 270,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7632728799",
    titlePt: "Caneta Stylus 2ª Geração para Tablet",
    priceCny: 298,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7623936288",
    titlePt: "Fone TWS Pro 3ª Geração MagSafe USB-C",
    priceCny: 129,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7542699356",
    titlePt: "Tênis de Basquete Alto Antiderrapante Solado Grosso",
    priceCny: 888,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7571961944",
    titlePt: "Bota Curta Couro Sintético Feminina",
    priceCny: 228,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7556952783",
    titlePt: "Calça Cropped Couro PU com Strass",
    priceCny: 348,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7388734828",
    titlePt: "Calça Jeans Slim Diversas Cores",
    priceCny: 238,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7386662157",
    titlePt: "Tênis Low Top Estilo Urbano",
    priceCny: 120,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7566796357",
    titlePt: "Casaco Longo com Capuz Forro Polar",
    priceCny: 590,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7428474671",
    titlePt: "Camiseta Básica Unissex Oversized",
    priceCny: 99,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7570022623",
    titlePt: "Casaco Corta-Vento Impermeável Tecnologia Dry",
    priceCny: 1300,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7402520780",
    titlePt: "Camiseta Estampada de Verão",
    priceCny: 118,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7572611824",
    titlePt: "Colete Acolchoado Fashion Inverno",
    priceCny: 236,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7576909422",
    titlePt: "Camiseta Streetwear Edição Especial",
    priceCny: 160,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7421534661",
    titlePt: "Tênis Plataforma Casual",
    priceCny: 420,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7392935064",
    titlePt: "Óculos de Sol Cat Eye Proteção UV400",
    priceCny: 230,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7388253928",
    titlePt: "Tênis Fashion Streetwear Moderno",
    priceCny: 480,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7390473789",
    titlePt: "Bolsa Compacta Multifuncional",
    priceCny: 59,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7418314380",
    titlePt: "Tênis Waffle Texturizado Casual",
    priceCny: 270,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7393295696",
    titlePt: "Perfume Masculino Amadeirado 100ml",
    priceCny: 108,
    category: "beleza",
  },
  {
    url: "https://weidian.com/item.html?itemID=7391267669",
    titlePt: "Pulseira Cubic Zircônia Feminina",
    priceCny: 90,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7392304288",
    titlePt: "Bolsa de Mão Fashion Couro Sintético",
    priceCny: 385,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7387308437",
    titlePt: "Controle Sem Fio para Console Gamer",
    priceCny: 520,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7400912230",
    titlePt: "Relógio Masculino Automático Aço Inox",
    priceCny: 1288,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7400896120",
    titlePt: "Fone Over-Ear Dobrável com Microfone",
    priceCny: 245,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7400882622",
    titlePt: "Relógio Automático Clássico Esqueleto",
    priceCny: 1688,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7399176632",
    titlePt: "Relógio Masculino Quartzo Elegante",
    priceCny: 308,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7515649491",
    titlePt: "Tênis Casual Placa Solado Grosso",
    priceCny: 369,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7494600429",
    titlePt: "Moletom Esportivo Feminino Manga Longa",
    priceCny: 120,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7424577749",
    titlePt: "Sandália Slide Unissex Confortável",
    priceCny: 118,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7425303732",
    titlePt: "Mala de Viagem Grande Capacidade com Rodas",
    priceCny: 199,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7395989993",
    titlePt: "Camiseta de Futebol Manga Curta Dry-Fit",
    priceCny: 79,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7424638812",
    titlePt: "Tênis Running Solado EVA Amortecido",
    priceCny: 260,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7386307133",
    titlePt: "Tênis Retro Low Top Casual",
    priceCny: 240,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7425201304",
    titlePt: "Anel Ajustável com Strass Dourado",
    priceCny: 88,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7464669388",
    titlePt: "Fone HD Over-Ear Dobrável com Microfone",
    priceCny: 545,
    category: "eletronicos",
  },
  {
    url: "https://weidian.com/item.html?itemID=7424613442",
    titlePt: "Acessório Weidian Estilo Contemporâneo",
    priceCny: null,
    category: "outros",
  },
  {
    url: "https://weidian.com/item.html?itemID=7464717164",
    titlePt: "Relógio Automático Masculino Data Duplo Fuso",
    priceCny: 2680,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7432952811",
    titlePt: "Maiô Estampado Fashion Feminino",
    priceCny: 139,
    category: "moda",
  },
  {
    url: "https://weidian.com/item.html?itemID=7423321207",
    titlePt: "Bolsa Feminina Quadrada Minimalista",
    priceCny: 136,
    category: "acessorios",
  },
  {
    url: "https://weidian.com/item.html?itemID=7464711086",
    titlePt: "Relógio Feminino Clássico Pulseira Couro Genuíno",
    priceCny: 460,
    category: "acessorios",
  },
];

/** Títulos curados (RAW) por chave canônica — sempre prevalecem sobre export/API. */
export const CURATED_TITLE_BY_CANONICAL_KEY = new Map<string, string>(
  RAW.map((r) => [productUrlToCanonicalKey(r.url), r.titlePt]).filter(([k]) =>
    Boolean(k),
  ),
);

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

const baseList: ExplorarProduct[] =
  Array.isArray(exported) && exported.length > 0 ? exported : BUILT_IN;

/** Normaliza URL para dedupe (remove query string). */
function urlKey(u: string): string {
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname}`;
  } catch {
    return u;
  }
}

const baseUrls = new Set(baseList.map((p) => urlKey(p.url)));

const fromFeatured: ExplorarProduct[] = FEATURED_PRODUCTS.filter(
  (fp) => !baseUrls.has(urlKey(fp.url)),
).map((fp) => {
  const slug = `${slugify(fp.title)}-${fp.id}`;
  const category =
    fp.category === "marcas-chinesas" ? "marcas-chinesas" : "outros";
  return {
    id: fp.id,
    url: fp.url,
    title: fp.title,
    titlePt: fp.title,
    image: fp.image ?? null,
    priceCny: fp.priceCny ?? null,
    priceBrl: fp.priceCny != null ? priceCnyToBrl(fp.priceCny) : fp.priceBrl ?? null,
    category,
    source: fp.source,
    slug,
    brand: fp.brand,
    storeName: fp.storeName,
    isChineseBrand: fp.isChineseBrand ?? fp.category === "marcas-chinesas",
  };
});

/** Lista de produtos: base (Admin/embutida) + produtos em destaque (featuredProducts.ts). Ordem invertida: primeiro = Casaco Térmico, último = Produto 1688. */
export const EXPLORAR_PRODUCTS: ExplorarProduct[] = [
  ...baseList,
  ...fromFeatured,
].reverse();
