/**
 * Produtos em destaque para a home e para Explorar.
 *
 * Para adicionar um produto: cd backend && npm run add-product "https://link-do-produto"
 * Para atualizar títulos/imagens de todos os produtos: cd backend && npm run update-featured-products
 *
 * Use category: "mais-vendidos" ou "tendencias" quando quiser.
 */

export type FeaturedCategory = "destaques" | "mais-vendidos" | "tendencias";

export interface FeaturedProduct {
  id: string;
  url: string;
  title: string;
  /** URL da imagem do produto (opcional; se vazio, usa placeholder) */
  image?: string;
  /** Preço em reais (exibido na home) */
  priceBrl?: number;
  /** Preço em yuan (referência) */
  priceCny?: number;
  category: FeaturedCategory;
  /** Origem: 1688, Taobao, etc. */
  source: "1688" | "Taobao" | "Weidian" | "TMALL" | "JD.com" | "Pinduoduo" | "Goofish" | "Dangdang" | "VIP Shop";
}

/** Rótulos em português das categorias */
export const CATEGORY_LABELS: Record<FeaturedCategory, string> = {
  destaques: "Em destaque",
  "mais-vendidos": "Mais vendidos",
  tendencias: "Tendências",
};

/** Lista de produtos curados. Adicione aqui os links que você quer destacar. */
export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: "5",
    url: "https://weidian.com/item.html?itemID=7487692568&spider_token=a984",
    title: "Nº 770 Carteira de alta qualidade",
    image: "https://si.geilicdn.com/weidian173984827-33140000018dd3b7a83a0a23136f_1200_1200.jpg?w=250&h=250&cp=1",
    priceBrl: 308.44,
    priceCny: 329,
    category: "destaques",
    source: "Weidian",
  },
  {
    id: "7",
    url: "https://weidian.com/item.html?p=iphone&itemID=7385095307&a=b&wfr=BuyercopyURL&distributorId=1626501936&share_relation=c0c070d74ec04a2a_1626501936_1",
    title: "Fones de ouvido sem fio Jenny TWS",
    image: "https://si.geilicdn.com/pcitem1626501936-4f3e00000194b10535990a23111a-unadjust_300_300.png.webp?w=750&h=750&cp=1",
    priceBrl: 150,
    priceCny: 160,
    category: "destaques",
    source: "Weidian",
  },
  {
    id: "8",
    url: "https://shop173984827.v.weidian.com/item.html?itemID=7538171799&spider_token=14f2",
    title: "No.1008 relógio DE fábrica ARF DE alta qualidade E melhor qualidade",
    image: "https://si.geilicdn.com/weidian173984827-33140000018dd3b7a83a0a23136f_1200_1200.jpg?w=250&h=250&cp=1",
    priceBrl: 3356.25,
    priceCny: 3580,
    category: "destaques",
    source: "Weidian",
  },
  {
    id: "goofish-store",
    url: "https://www.goofish.com/personal?spm=a21ybx.item.itemHeader.1.f3293da6gcutDG&userId=3252814831",
    title: "Loja Goofish (闲鱼) — marketplace de usados",
    image: "http://img.alicdn.com/bao/uploaded/i3/O1CN01VRlRnd1lYeGNISpl4_!!0-mtopupload.jpg",
    category: "destaques",
    source: "Goofish",
  },
  // Adicione mais itens abaixo. Use category: "mais-vendidos" ou "tendencias" quando quiser.
];
