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
  // Produtos serão adicionados pelos links que você enviar.
];
