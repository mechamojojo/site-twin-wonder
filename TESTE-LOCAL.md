# Testar o site in loco (com preço)

## 1. Subir o backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Deixe rodando (API em http://localhost:4000).

## 2. Subir o frontend

Em **outro terminal**, na raiz do projeto:

```bash
npm install
npm run dev
```

Abre http://localhost:8080.

## 3. Ver preço na página do produto

- **Com backend rodando:** o endpoint `/api/price/preview` sempre devolve um preço (usando o valor do scrape quando der, ou um valor simulado). Abra um link de produto, ex.:  
  `http://localhost:8080/pedido?url=https://detail.1688.com/offer/123.html`
- **Só frontend (backend parado):** em modo desenvolvimento, se depois de ~2 segundos não vier preço da API, o frontend mostra um **preço de teste** (R$ 82,50) para você conseguir testar a tela. Esse valor é só para desenvolvimento.

## 4. Scraping (preço/título/imagens reais)

Para o preço e os dados do produto virem do site (1688, Taobao, etc.), o backend usa Playwright. Instale o Chromium uma vez:

```bash
cd backend
npm run scraper:install
```

Depois, ao abrir um link de produto, o backend tenta abrir a página e extrair título, preço e imagens. Sites chineses às vezes bloqueiam ou demoram; se não aparecer nada, o preço simulado ainda é exibido (backend) ou o preço de teste (frontend em dev).

## 5. Conferir se a API responde

- Health: http://localhost:4000/api/health  
- Preço (troque pela URL do produto):  
  http://localhost:4000/api/price/preview?url=https%3A%2F%2Fdetail.1688.com%2Foffer%2F123.html  

Se isso retornar JSON com `totalProductBrl`, o frontend consegue mostrar preço.

## 6. Adicionar produto à página Explorar (com scrape)

Para adicionar um link à seção Explorar com título, imagem e preço obtidos automaticamente:

```bash
cd backend
npm run add-product "https://weidian.com/item.html?itemID=123"
```

Ou com link 1688, Taobao, etc. O script usa o scraper para extrair os dados e grava em `src/data/featuredProducts.ts`.
