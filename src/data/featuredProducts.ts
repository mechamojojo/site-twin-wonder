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
    priceBrl: 276.56,
    priceCny: 295,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "4",
    url: "https://www.cssbuy.com/item-micro-7242032516.html?promotionCode=97d0385889e0bcfe",
    title: "Óculos Retangular Preto com Bordas Cromadas",
    image: "https://si.geilicdn.com/wdseller1413661299-3a900000019a2ddcd7730a21146b_640_834.jpg",
    priceBrl: 56.25,
    priceCny: 60,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "5",
    url: "https://www.cssbuy.com/item-1688-906172537430.html?promotionCode=97d0385889e0bcfe",
    title: "Suéter Preto Cropped Com Textura Trançada",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01wOHQ9w1pliGyecrjm_!!2219391975401-0-cib.jpg",
    priceBrl: 63.75,
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
    priceBrl: 40.5,
    priceCny: 40,
    category: "destaques",
    source: "1688",
  },

  {
    id: "8",
    url: "https://www.cssbuy.com/item-micro-7291897608.html?promotionCode=97d0385889e0bcfe",
    title: "Tênis Branco Solado Alto Com Detalhe Cinza",
    image: "https://si.geilicdn.com/pcitem401669759-789700000192b3d558040a239646_1200_800.jpg",
    priceBrl: 296.25,
    priceCny: 316,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "9",
    url: "https://www.cssbuy.com/item-micro-7646566894.html",
    title: "Tênis Low Top Vermelho Branco Preto",
    image: "https://si.geilicdn.com/pcitem1849262770-533c0000019b597a75b70a2103bd_1440_1440.jpg",
    priceBrl: 150,
    priceCny: 160,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "10",
    url: "https://www.cssbuy.com/item-1688-721633273966.html",
    title: "Chinelo Preto EVA Com Fivela Ajustável",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN011wDcVG1m6Xmx29C2V_!!2215715214905-0-cib.jpg",
    priceBrl: 79.41,
    priceCny: 84.7,
    category: "destaques",
    source: "1688",
  },

  {
    id: "11",
    url: "https://www.cssbuy.com/item-1688-995638420673.html",
    title: "Câmera Vermelha Portátil com Corrente",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01FlGJgL1ocGTBrlOib_!!2220346195245-0-cib.jpg",
    priceBrl: 50.63,
    priceCny: 50,
    category: "destaques",
    source: "1688",
  },

  {
    id: "12",
    url: "https://www.cssbuy.com/item-1688-931736356187.html",
    title: "Bermuda Branca Canelada Com Cordão",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01fWVnTH2C1fYtU34UX_!!2217853038414-0-cib.jpg",
    priceBrl: 64.69,
    priceCny: 69,
    category: "destaques",
    source: "1688",
  },

  {
    id: "13",
    url: "https://www.cssbuy.com/item-xianyu-1018907837162.html",
    title: "Óculos de Grau Armação Preta Acetato Italiana",
    image: "http://img.alicdn.com/bao/uploaded/i4/O1CN01GqehDe1YScI47EjKF_!!4611686018427386018-53-fleamarket.heic",
    priceBrl: 157.5,
    priceCny: 168,
    category: "destaques",
    source: "1688",
  },

  {
    id: "14",
    url: "https://www.cssbuy.com/item-1688-903632659617.html",
    title: "Camisa Futebol Retrô Azul e Vermelha",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN019djlWu2FNbM7jcHDU_!!2216775178868-0-cib.jpg",
    priceBrl: 45.56,
    priceCny: 45,
    category: "destaques",
    source: "1688",
  },

  {
    id: "15",
    url: "https://www.cssbuy.com/item-1688-908740363468.html?promotionCode=b91c99562dcf72ae",
    title: "Jaqueta Preta Bicolor À Prova de Vento",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01Qa83fp2JWzwnmNqJw_!!2219421459430-0-cib.jpg",
    priceBrl: 65.63,
    priceCny: 70,
    category: "destaques",
    source: "1688",
  },

  {
    id: "16",
    url: "https://www.cssbuy.com/item-1688-908740363468.html?promotionCode=b91c99562dcf72ae",
    title: "Jaqueta Preta Bicolor À Prova de Vento",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01Qa83fp2JWzwnmNqJw_!!2219421459430-0-cib.jpg",
    priceBrl: 65.63,
    priceCny: 70,
    category: "destaques",
    source: "1688",
  },

  {
    id: "17",
    url: "https://www.cssbuy.com/item-1688-887320307437.html?promotionCode=b91c99562dcf72ae",
    title: "Pulseira Prateada Cisne com Cristais Pretos",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01eKTC1Q1ztAnKuDPOi_!!2218809556771-0-cib.jpg",
    priceBrl: 32.4,
    priceCny: 32,
    category: "destaques",
    source: "1688",
  },

  {
    id: "18",
    url: "https://www.cssbuy.com/item-micro-7611437571.html",
    title: "Sandália Anatômica Branca Com Fivela",
    image: "https://si.geilicdn.com/pcitem901870080011-655f00000197a620f9000a21146b_1440_1440.jpg",
    priceBrl: 103.13,
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
    priceBrl: 182.81,
    priceCny: 195,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "21",
    url: "https://www.cssbuy.com/item-1688-943594145520.html",
    title: "Camiseta Preta Azul Listrada Automobilismo",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01jHxvLW1VVsCn5AROJ_!!2219510932659-0-cib.jpg",
    priceBrl: 60.94,
    priceCny: 65,
    category: "destaques",
    source: "1688",
  },

  {
    id: "22",
    url: "https://www.cssbuy.com/item-micro-7463135830.html?promotionCode=64055c819fc1e9d7",
    title: "Tênis Esportivo Texturizado Cores Variadas",
    image: "https://si.geilicdn.com/wdseller901944752222-30fb00000196ab67a4ff0a81347d_1080_1080.jpg",
    priceBrl: 29.36,
    priceCny: 29,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "23",
    url: "https://www.cssbuy.com/item-1688-810225356450.html?promotionCode=2e0967de23536940",
    title: "Tigela Cerâmica Verde Menta Brilhante",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01VTiE9A1R0wtzIU0wx_!!2218121962050-0-cib.jpg",
    priceBrl: 18.23,
    priceCny: 18,
    category: "destaques",
    source: "1688",
  },

  {
    id: "24",
    url: "https://www.cssbuy.com/item-1688-765750210603.html?promotionCode=2e0967de23536940",
    title: "Mochila Preta Notebook Com Compartimentos",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01lFBF2Z1bTTgdaeBVI_!!2217183663466-0-cib.jpg",
    priceBrl: 131.25,
    priceCny: 140,
    category: "destaques",
    source: "1688",
  },

  {
    id: "25",
    url: "https://detail.1688.com/offer/1001041157743.html",
    title: "Camiseta Futebol Listrada Azul E Branca",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01pI5M7w1iHl2vMfDJo_!!2219563234388-0-cib.jpg",
    priceBrl: 37.46,
    priceCny: 37,
    category: "destaques",
    source: "1688",
  },

  {
    id: "26",
    url: "https://www.cssbuy.com/item-1688-947671793357.html",
    title: "Jaqueta Corta Vento Preta E Vermelha",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01YlJYuw1KRmu0CZccT_!!2218473121161-0-cib.jpg",
    priceBrl: 85.31,
    priceCny: 91,
    category: "destaques",
    source: "1688",
  },

  {
    id: "27",
    url: "https://item.taobao.com/item.htm?id=839059399670",
    title: "Tênis Esportivo Urbano",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "28",
    url: "https://item.taobao.com/item.htm?id=838985063422",
    title: "Camiseta Básica 100% Algodão Gola Redonda",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "29",
    url: "https://item.taobao.com/item.htm?id=888585094652",
    title: "Calça Esportiva Moderna",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "30",
    url: "https://item.taobao.com/item.htm?id=839490280650",
    title: "Tênis Casual Confortável",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "31",
    url: "https://item.taobao.com/item.htm?id=839316241673",
    title: "Jaqueta Estilo Streetwear",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "32",
    url: "https://item.taobao.com/item.htm?id=865816351841",
    title: "Bolsa Feminina Aba Estruturada Alça Dourada",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "33",
    url: "https://item.taobao.com/item.htm?id=846052606738",
    title: "Óculos de Sol Lente Espelhada UV400",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "34",
    url: "https://item.taobao.com/item.htm?id=903687863300",
    title: "Tênis Running Masculino",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "35",
    url: "https://item.taobao.com/item.htm?id=839099750738",
    title: "Camiseta Oversized Unissex",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  {
    id: "36",
    url: "https://item.taobao.com/item.htm?id=898221705189",
    title: "Acessório Unissex Acabamento Metálico",
    image: "https://gw.alicdn.com/tps/i2/TB1nmqyFFXXXXcQbFXXE5jB3XXX-114-114.png",


    category: "destaques",
    source: "Taobao",
  },

  { id: "37", url: "https://item.taobao.com/item.htm?id=897376673796", title: "Relógio Esportivo Masculino", category: "destaques", source: "Taobao" },
  { id: "38", url: "https://item.taobao.com/item.htm?id=895366521858", title: "Tênis Feminino com Plataforma", category: "destaques", source: "Taobao" },
  { id: "39", url: "https://item.taobao.com/item.htm?id=846545880345", title: "Camiseta Polo Algodão", category: "destaques", source: "Taobao" },
  { id: "40", url: "https://item.taobao.com/item.htm?id=858198546948", title: "Bolsa Mochila Casual", category: "destaques", source: "Taobao" },
  { id: "41", url: "https://item.taobao.com/item.htm?id=838987763254", title: "Tênis Low Top Casual", category: "destaques", source: "Taobao" },
  { id: "42", url: "https://item.taobao.com/item.htm?id=839009655236", title: "Calça Jogger Streetwear", category: "destaques", source: "Taobao" },
  { id: "43", url: "https://item.taobao.com/item.htm?id=839043723005", title: "Tênis Chunky Plataforma Sola Tratorada", category: "destaques", source: "Taobao" },
  { id: "44", url: "https://item.taobao.com/item.htm?id=839058254611", title: "Jaqueta Corta-Vento Leve", category: "destaques", source: "Taobao" },
  { id: "45", url: "https://item.taobao.com/item.htm?id=839060027138", title: "Camiseta Gráfica Estampada", category: "destaques", source: "Taobao" },
  { id: "46", url: "https://item.taobao.com/item.htm?id=839573564898", title: "Tênis Esportivo com Amortecimento", category: "destaques", source: "Taobao" },
  { id: "47", url: "https://item.taobao.com/item.htm?id=839567768386", title: "Calça Cargo Feminina", category: "destaques", source: "Taobao" },
  { id: "48", url: "https://item.taobao.com/item.htm?id=839583900285", title: "Óculos de Sol Cat Eye", category: "destaques", source: "Taobao" },

  { id: "49", url: "https://item.taobao.com/item.htm?id=904497895116", title: "Tênis Casual Colorblock", category: "destaques", source: "Taobao" },
  { id: "50", url: "https://item.taobao.com/item.htm?id=1020876772154", title: "Moletom Oversized Streetwear", category: "destaques", source: "Taobao" },
  { id: "51", url: "https://item.taobao.com/item.htm?id=919018655387", title: "Sandália Slide Masculina", category: "destaques", source: "Taobao" },
  { id: "52", url: "https://item.taobao.com/item.htm?id=780818009643", title: "Bolsa de Mão Clutch Cetim com Fecho", category: "destaques", source: "Taobao" },
  { id: "53", url: "https://item.taobao.com/item.htm?id=780733191053", title: "Tênis Retro Colorido", category: "destaques", source: "Taobao" },
  { id: "54", url: "https://item.taobao.com/item.htm?id=999764688748", title: "Camisa Social Slim Fit", category: "destaques", source: "Taobao" },
  { id: "55", url: "https://item.taobao.com/item.htm?id=871259447761", title: "Tênis Plataforma Feminino", category: "destaques", source: "Taobao" },
  { id: "56", url: "https://item.taobao.com/item.htm?id=998171191973", title: "Relógio Analógico Clássico", category: "destaques", source: "Taobao" },
  { id: "57", url: "https://item.taobao.com/item.htm?id=857838558201", title: "Camiseta Esportiva Dry-Fit", category: "destaques", source: "Taobao" },
  { id: "58", url: "https://item.taobao.com/item.htm?id=1019298312907", title: "Tênis Slip-On Casual", category: "destaques", source: "Taobao" },
  { id: "59", url: "https://item.taobao.com/item.htm?id=1025305893578", title: "Jaqueta Acolchoada Leve", category: "destaques", source: "Taobao" },
  { id: "60", url: "https://item.taobao.com/item.htm?id=1026099056093", title: "Tênis Urbano Cano Baixo Lateral Texturizada", category: "destaques", source: "Taobao" },
  { id: "61", url: "https://item.taobao.com/item.htm?id=983228190448", title: "Camiseta Básica Colorida", category: "destaques", source: "Taobao" },
  { id: "62", url: "https://item.taobao.com/item.htm?id=986391473672", title: "Produto Taobao", category: "destaques", source: "Taobao" },
  { id: "63", url: "https://detail.1688.com/offer/985508910690.html", title: "Produto 1688", category: "destaques", source: "1688" },
];
