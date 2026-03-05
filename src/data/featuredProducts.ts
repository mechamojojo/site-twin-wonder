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

  {
    id: "1",
    url: "https://www.cssbuy.com/item-843480162084.html?promotionCode=97d0385889e0bcfe",
    title: "CSSBuy: Agente Taobao | compras Compre 1688.com",



    category: "destaques",
    source: "1688",
  },

  {
    id: "2",
    url: "https://www.cssbuy.com/item-660982931231.html?promotionCode=97d0385889e0bcfe",
    title: "CSSBuy: Agente Taobao | compras Compre 1688.com",



    category: "destaques",
    source: "1688",
  },

  {
    id: "3",
    url: "https://www.cssbuy.com/item-micro-7281458190.html?promotionCode=97d0385889e0bcfe",
    title: "Coleção DE relógios Bears vivi",
    image: "https://si.geilicdn.com/wdseller901767704990-01c0000001923c0c4cbc0a20e284_1440_1442.jpg",
    priceBrl: 276.56,
    priceCny: 295,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "4",
    url: "https://www.cssbuy.com/item-micro-7242032516.html?promotionCode=97d0385889e0bcfe",
    title: "Óculos Sol Autônomos Light Luxury Plate Frame Unissex Hot Sellers Wang Di Same Style Spring/Summer Runaway Sunglasses",
    image: "https://si.geilicdn.com/wdseller1413661299-3a900000019a2ddcd7730a21146b_640_834.jpg",
    priceBrl: 56.25,
    priceCny: 60,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "5",
    url: "https://www.cssbuy.com/item-1688-906172537430.html?promotionCode=97d0385889e0bcfe",
    title: "Nova Erd Melancholy Rich Second Generation Ripped and Distressed Suéter Solto para Homens Mulheres Atacado",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01wOHQ9w1pliGyecrjm_!!2219391975401-0-cib.jpg",
    priceBrl: 63.75,
    priceCny: 68,
    category: "destaques",
    source: "1688",
  },

  {
    id: "6",
    url: "https://www.cssbuy.com/item-933036824879.html?promotionCode=97d0385889e0bcfe",
    title: "CSSBuy: Agente Taobao | compras Compre 1688.com",



    category: "destaques",
    source: "1688",
  },

  {
    id: "7",
    url: "https://www.cssbuy.com/item-1688-751987733548.html?promotionCode=97d0385889e0bcfe",
    title: "Calças desportivas masculinas Youngla costura às riscas bordado casuais ginásio retas",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01e4boLz1TTv7h1niLt_!!2215613182384-0-cib.jpg",
    priceBrl: 40.5,
    priceCny: 40,
    category: "destaques",
    source: "1688",
  },

  {
    id: "8",
    url: "https://www.cssbuy.com/item-micro-7291897608.html?promotionCode=97d0385889e0bcfe",
    title: "*",
    image: "https://si.geilicdn.com/pcitem401669759-789700000192b3d558040a239646_1200_800.jpg",
    priceBrl: 296.25,
    priceCny: 316,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "9",
    url: "https://www.cssbuy.com/item-micro-7646566894.html",
    title: "Qingyuan Special J1 Baixo Branco Vermelho Chicago HQ6998",
    image: "https://si.geilicdn.com/pcitem1849262770-533c0000019b597a75b70a2103bd_1440_1440.jpg",
    priceBrl: 150,
    priceCny: 160,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "10",
    url: "https://www.cssbuy.com/item-1688-721633273966.html",
    title: "Sapatos planos Eva verão uso externo Fivela dupla Sandálias Impermeáveis Antiderrapantes praia ultra-leves casal",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN011wDcVG1m6Xmx29C2V_!!2215715214905-0-cib.jpg",
    priceBrl: 79.41,
    priceCny: 84.7,
    category: "destaques",
    source: "1688",
  },

  {
    id: "11",
    url: "https://www.cssbuy.com/item-1688-995638420673.html",
    title: "Mini Câmera Transfronteiriça G6 Thumb para Festa Estudantes Esportes ao Livre Bolso Infantil Gravação Fotos Vídeos",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01FlGJgL1ocGTBrlOib_!!2220346195245-0-cib.jpg",
    priceBrl: 50.63,
    priceCny: 50,
    category: "destaques",
    source: "1688",
  },

  {
    id: "12",
    url: "https://www.cssbuy.com/item-1688-931736356187.html",
    title: "Logotipo Rl Raff Pony Bordado Corduroy Respirável Versátil Calças Verão Cinco Pontos Algodão Puro Calções Soltos",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01fWVnTH2C1fYtU34UX_!!2217853038414-0-cib.jpg",
    priceBrl: 64.69,
    priceCny: 69,
    category: "destaques",
    source: "1688",
  },

  {
    id: "13",
    url: "https://www.cssbuy.com/item-xianyu-1018907837162.html",
    title: "Versão superior armação óculos preto * MU04UY, para todos os jogos ||| calibre, fabricado Itália. ✅Dimensões 51-20-135",
    image: "http://img.alicdn.com/bao/uploaded/i4/O1CN01GqehDe1YScI47EjKF_!!4611686018427386018-53-fleamarket.heic",
    priceBrl: 157.5,
    priceCny: 168,
    category: "destaques",
    source: "1688",
  },

  {
    id: "14",
    url: "https://www.cssbuy.com/item-1688-903632659617.html",
    title: "Camisa Futebol retrô transfronteiriça Inter Manchester United São Paulo New Cas Atletico Colossi Ham Americas Football",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN019djlWu2FNbM7jcHDU_!!2216775178868-0-cib.jpg",
    priceBrl: 45.56,
    priceCny: 45,
    category: "destaques",
    source: "1688",
  },

  {
    id: "15",
    url: "https://www.cssbuy.com/item-1688-908740363468.html?promotionCode=b91c99562dcf72ae",
    title: "Jaqueta montanhismo masculina feminina três outono inverno à prova vento comércio exterior transfronteiriço versão EUA",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01Qa83fp2JWzwnmNqJw_!!2219421459430-0-cib.jpg",
    priceBrl: 65.63,
    priceCny: 70,
    category: "destaques",
    source: "1688",
  },

  {
    id: "16",
    url: "https://www.cssbuy.com/item-1688-908740363468.html?promotionCode=b91c99562dcf72ae",
    title: "Jaqueta montanhismo masculina feminina três outono inverno à prova vento comércio exterior transfronteiriço versão EUA",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01Qa83fp2JWzwnmNqJw_!!2219421459430-0-cib.jpg",
    priceBrl: 65.63,
    priceCny: 70,
    category: "destaques",
    source: "1688",
  },

  {
    id: "17",
    url: "https://www.cssbuy.com/item-1688-887320307437.html?promotionCode=b91c99562dcf72ae",
    title: "Pulseira Swarovski Elemento Cristal Azul Swan Pull Shijia Gradiente Preto Feminino",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01eKTC1Q1ztAnKuDPOi_!!2218809556771-0-cib.jpg",
    priceBrl: 32.4,
    priceCny: 32,
    category: "destaques",
    source: "1688",
  },

  {
    id: "18",
    url: "https://www.cssbuy.com/item-micro-7611437571.html",
    title: "[Versão GX2.0] Birken",
    image: "https://si.geilicdn.com/pcitem901870080011-655f00000197a620f9000a21146b_1440_1440.jpg",
    priceBrl: 103.13,
    priceCny: 110,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "19",
    url: "https://www.cssbuy.com/item-839418894365.html",
    title: "CSSBuy: Agente Taobao | compras Compre 1688.com",



    category: "destaques",
    source: "1688",
  },

  {
    id: "20",
    url: "https://weidian.com/item.html?itemID=7699275699&spider_token=c6ac",
    title: "[M] Série chinelos *",
    image: "https://si.geilicdn.com/pcitem1824678471-66c10000019c904dda6f0a2102c5-unadjust_1080_1080.png",
    priceBrl: 182.81,
    priceCny: 195,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "21",
    url: "https://www.cssbuy.com/item-1688-943594145520.html",
    title: "202526F1 Fato Corrida Mercedes McLaren Futebol Red Bull Ferrari Camisa Aston Martin",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01jHxvLW1VVsCn5AROJ_!!2219510932659-0-cib.jpg",
    priceBrl: 60.94,
    priceCny: 65,
    category: "destaques",
    source: "1688",
  },

  {
    id: "22",
    url: "https://www.cssbuy.com/item-micro-7463135830.html?promotionCode=64055c819fc1e9d7",
    title: "versão lw do verdadeiro estourar caixa cega coco 350 não é reembolsável pode ser feita desejo Oh querida",
    image: "https://si.geilicdn.com/wdseller901944752222-30fb00000196ab67a4ff0a81347d_1080_1080.jpg",
    priceBrl: 29.36,
    priceCny: 29,
    category: "destaques",
    source: "Weidian",
  },

  {
    id: "23",
    url: "https://www.cssbuy.com/item-1688-810225356450.html?promotionCode=2e0967de23536940",
    title: "Tigela arroz 15 cm, macarrão, talheres, sopa, conjunto seis peças gradiente cor Underglaze Color",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01VTiE9A1R0wtzIU0wx_!!2218121962050-0-cib.jpg",
    priceBrl: 18.23,
    priceCny: 18,
    category: "destaques",
    source: "1688",
  },

  {
    id: "24",
    url: "https://www.cssbuy.com/item-1688-765750210603.html?promotionCode=2e0967de23536940",
    title: "nova mochila ao livre Beijia é casual, simples, versátil, estudante, multifuncional, viagem grande capacidade",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01lFBF2Z1bTTgdaeBVI_!!2217183663466-0-cib.jpg",
    priceBrl: 131.25,
    priceCny: 140,
    category: "destaques",
    source: "1688",
  },

  {
    id: "25",
    url: "https://detail.1688.com/offer/1001041157743.html",
    title: "Camisetas do jogador alemão Copa Mundo 2026 futebol",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01pI5M7w1iHl2vMfDJo_!!2219563234388-0-cib.jpg",
    priceBrl: 37.46,
    priceCny: 37,
    category: "destaques",
    source: "1688",
  },

  {
    id: "26",
    url: "https://www.cssbuy.com/item-1688-947671793357.html",
    title: "Casaco motocicleta bordado couro engrossado marca moderna jaqueta beisebol algodão casal voo",
    image: "https://cbu01.alicdn.com/img/ibank/O1CN01YlJYuw1KRmu0CZccT_!!2218473121161-0-cib.jpg",
    priceBrl: 85.31,
    priceCny: 91,
    category: "destaques",
    source: "1688",
  },
];
