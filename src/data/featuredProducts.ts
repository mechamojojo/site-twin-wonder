/**
 * Produtos em destaque para a home e para Explorar.
 *
 * Para adicionar um produto: cd backend && npm run add-product "https://link-do-produto"
 * Para atualizar títulos/imagens de todos os produtos: cd backend && npm run update-featured-products
 *
 * Use category: "mais-vendidos", "tendencias" ou "marcas-chinesas" para marcas chinesas.
 */

export type FeaturedCategory = "destaques" | "mais-vendidos" | "tendencias" | "marcas-chinesas";

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
  /** Nome da marca (marcas chinesas) */
  brand?: string;
  /** Nome da loja / store (ex.: "Loja X no Taobao") */
  storeName?: string;
  /** Produto de marca chinesa — destacado com badge "Marca chinesa" */
  isChineseBrand?: boolean;
}

/** Rótulos em português das categorias */
export const CATEGORY_LABELS: Record<FeaturedCategory, string> = {
  destaques: "Em destaque",
  "mais-vendidos": "Mais vendidos",
  tendencias: "Tendências",
  "marcas-chinesas": "Marcas chinesas",
};

/**
 * Lista de produtos curados. Adicione aqui os links que você quer destacar.
 *
 * Para marcas chinesas, use:
 *   category: "marcas-chinesas",
 *   brand: "Nome da Marca",
 *   storeName: "Loja no Taobao" (ou 1688/Weidian),
 *   isChineseBrand: true,
 */
export const FEATURED_PRODUCTS: FeaturedProduct[] = [

  {
    id: "1",
    url: "https://www.cssbuy.com/item-843480162084.html?promotionCode=97d0385889e0bcfe",
    title: "Camiseta Casual 100% Algodão Lavagem Estonada",



    category: "destaques",
    source: "1688",
  },

  {
    id: "2",
    url: "https://www.cssbuy.com/item-660982931231.html?promotionCode=97d0385889e0bcfe",
    title: "Tênis Esportivo Solado Chunky Cadarço Colorido",



    category: "destaques",
    source: "1688",
  },

  {
    id: "3",
    url: "https://www.cssbuy.com/item-micro-7281458190.html?promotionCode=97d0385889e0bcfe",
    title: "Relógio Aço Inoxidável Mostrador Prata Brilhante",
    image: "https://si.geilicdn.com/wdseller901767704990-01c0000001923c0c4cbc0a20e284_1440_1442.jpg",
    priceBrl: 310.64,
    priceCny: 295,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "4",
    url: "https://www.cssbuy.com/item-micro-7242032516.html?promotionCode=97d0385889e0bcfe",
    title: "Óculos Retangular Preto com Bordas Cromadas",
    image: "https://si.geilicdn.com/wdseller1413661299-3a900000019a2ddcd7730a21146b_640_834.jpg",
    priceBrl: 70.2,
    priceCny: 60,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "5",
    url: "https://www.cssbuy.com/item-1688-906172537430.html?promotionCode=97d0385889e0bcfe",
    title: "Suéter Preto Cropped Com Textura Trançada",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01wOHQ9w1pliGyecrjm_!!2219391975401-0-cib.jpg",
    priceBrl: 79.56,
    priceCny: 68,
    category: "destaques",
    source: "1688",
  },

  {
    id: "6",
    url: "https://www.cssbuy.com/item-933036824879.html?promotionCode=97d0385889e0bcfe",
    title: "Bolsa Streetwear Impermeável",



    category: "destaques",
    source: "1688",
  },

  {
    id: "7",
    url: "https://www.cssbuy.com/item-1688-751987733548.html?promotionCode=97d0385889e0bcfe",
    title: "Calça Esportiva Preta Com Listras Laterais",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01e4boLz1TTv7h1niLt_!!2215613182384-0-cib.jpg",
    priceBrl: 46.8,
    priceCny: 40,
    category: "destaques",
    source: "1688",
  },

  {
    id: "8",
    url: "https://www.cssbuy.com/item-micro-7291897608.html?promotionCode=97d0385889e0bcfe",
    title: "Tênis Branco Solado Alto Com Detalhe Cinza",
    image: "https://si.geilicdn.com/pcitem401669759-789700000192b3d558040a239646_1200_800.jpg",
    priceBrl: 332.75,
    priceCny: 316,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "9",
    url: "https://www.cssbuy.com/item-micro-7646566894.html",
    title: "Tênis Low Top Vermelho Branco Preto",
    image: "https://si.geilicdn.com/pcitem1849262770-533c0000019b597a75b70a2103bd_1440_1440.jpg",
    priceBrl: 168.48,
    priceCny: 160,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "10",
    url: "https://www.cssbuy.com/item-1688-721633273966.html",
    title: "Chinelo Preto EVA Com Fivela Ajustável",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN011wDcVG1m6Xmx29C2V_!!2215715214905-0-cib.jpg",
    priceBrl: 89.19,
    priceCny: 84.7,
    category: "destaques",
    source: "1688",
  },

  {
    id: "11",
    url: "https://www.cssbuy.com/item-1688-995638420673.html",
    title: "Câmera Vermelha Portátil com Corrente",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01FlGJgL1ocGTBrlOib_!!2220346195245-0-cib.jpg",
    priceBrl: 58.5,
    priceCny: 50,
    category: "destaques",
    source: "1688",
  },

  {
    id: "12",
    url: "https://www.cssbuy.com/item-1688-931736356187.html",
    title: "Bermuda Branca Canelada Com Cordão",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01fWVnTH2C1fYtU34UX_!!2217853038414-0-cib.jpg",
    priceBrl: 80.73,
    priceCny: 69,
    category: "destaques",
    source: "1688",
  },

  {
    id: "13",
    url: "https://www.cssbuy.com/item-xianyu-1018907837162.html",
    title: "Óculos de Grau Armação Preta Acetato Italiana",
    image: "http://img.alicdn.com/bao/uploaded/i4/O1CN01GqehDe1YScI47EjKF_!!4611686018427386018-53-fleamarket.heic",
    priceBrl: 176.9,
    priceCny: 168,
    category: "destaques",
    source: "1688",
  },

  {
    id: "14",
    url: "https://www.cssbuy.com/item-1688-903632659617.html",
    title: "Camisa Futebol Retrô Azul e Vermelha",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN019djlWu2FNbM7jcHDU_!!2216775178868-0-cib.jpg",
    priceBrl: 52.65,
    priceCny: 45,
    category: "destaques",
    source: "1688",
  },

  {
    id: "15",
    url: "https://www.cssbuy.com/item-1688-908740363468.html?promotionCode=b91c99562dcf72ae",
    title: "Jaqueta Preta Bicolor À Prova de Vento",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01Qa83fp2JWzwnmNqJw_!!2219421459430-0-cib.jpg",
    priceBrl: 81.9,
    priceCny: 70,
    category: "destaques",
    source: "1688",
  },

  {
    id: "16",
    url: "https://www.cssbuy.com/item-1688-908740363468.html?promotionCode=b91c99562dcf72ae",
    title: "Jaqueta Preta Bicolor À Prova de Vento",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01Qa83fp2JWzwnmNqJw_!!2219421459430-0-cib.jpg",
    priceBrl: 81.9,
    priceCny: 70,
    category: "destaques",
    source: "1688",
  },

  {
    id: "17",
    url: "https://www.cssbuy.com/item-1688-887320307437.html?promotionCode=b91c99562dcf72ae",
    title: "Pulseira Prateada Cisne com Cristais Pretos",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01eKTC1Q1ztAnKuDPOi_!!2218809556771-0-cib.jpg",
    priceBrl: 37.44,
    priceCny: 32,
    category: "destaques",
    source: "1688",
  },

  {
    id: "18",
    url: "https://www.cssbuy.com/item-micro-7611437571.html",
    title: "Sandália Anatômica Branca Com Fivela",
    image: "https://si.geilicdn.com/pcitem901870080011-655f00000197a620f9000a21146b_1440_1440.jpg",
    priceBrl: 115.83,
    priceCny: 110,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "19",
    url: "https://www.cssbuy.com/item-839418894365.html",
    title: "Jaqueta Esportiva Slim Fit",



    category: "destaques",
    source: "1688",
  },

  {
    id: "20",
    url: "https://weidian.com/item.html?itemID=7699275699&spider_token=c6ac",
    title: "Chinelo Slide Preto Com Solado Laranja",
    image: "https://si.geilicdn.com/pcitem1824678471-66c10000019c904dda6f0a2102c5-unadjust_1080_1080.png",
    priceBrl: 205.34,
    priceCny: 195,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "21",
    url: "https://www.cssbuy.com/item-1688-943594145520.html",
    title: "Camiseta Preta Azul Listrada Automobilismo",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01jHxvLW1VVsCn5AROJ_!!2219510932659-0-cib.jpg",
    priceBrl: 76.05,
    priceCny: 65,
    category: "destaques",
    source: "1688",
  },

  {
    id: "22",
    url: "https://www.cssbuy.com/item-micro-7463135830.html?promotionCode=64055c819fc1e9d7",
    title: "Tênis Esportivo Texturizado Cores Variadas",
    image: "https://si.geilicdn.com/wdseller901944752222-30fb00000196ab67a4ff0a81347d_1080_1080.jpg",
    priceBrl: 33.93,
    priceCny: 29,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "23",
    url: "https://www.cssbuy.com/item-1688-810225356450.html?promotionCode=2e0967de23536940",
    title: "Tigela Cerâmica Verde Menta Brilhante",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01VTiE9A1R0wtzIU0wx_!!2218121962050-0-cib.jpg",
    priceBrl: 21.06,
    priceCny: 18,
    category: "destaques",
    source: "1688",
  },

  {
    id: "24",
    url: "https://www.cssbuy.com/item-1688-765750210603.html?promotionCode=2e0967de23536940",
    title: "Mochila Preta Notebook Com Compartimentos",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01lFBF2Z1bTTgdaeBVI_!!2217183663466-0-cib.jpg",
    priceBrl: 147.42,
    priceCny: 140,
    category: "destaques",
    source: "1688",
  },

  {
    id: "25",
    url: "https://detail.1688.com/offer/1001041157743.html",
    title: "Camiseta Futebol Listrada Azul E Branca",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01pI5M7w1iHl2vMfDJo_!!2219563234388-0-cib.jpg",
    priceBrl: 43.29,
    priceCny: 37,
    category: "destaques",
    source: "1688",
  },

  {
    id: "26",
    url: "https://www.cssbuy.com/item-1688-947671793357.html",
    title: "Jaqueta Corta Vento Preta E Vermelha",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01YlJYuw1KRmu0CZccT_!!2218473121161-0-cib.jpg",
    priceBrl: 95.82,
    priceCny: 91,
    category: "destaques",
    source: "1688",
  },

  { id: "63", url: "https://detail.1688.com/offer/985508910690.html", title: "Produto 1688", category: "destaques", source: "1688" },
];
