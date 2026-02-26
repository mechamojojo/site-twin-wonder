# ComprasChina Backend

API em Node + Express + Prisma + PostgreSQL.

## Pré-requisitos

- Node 18+
- PostgreSQL (ou `docker compose up -d` na raiz do projeto)
- Para o **preview de produto** (imagens, título, preço do link): Chromium do Playwright

## Instalação

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Para o endpoint `/api/product/preview` funcionar (scraping de páginas Taobao/1688/etc.):

```bash
npm run scraper:install
```

Isso instala o navegador Chromium usado pelo Playwright. Sem isso, o endpoint retornará 404/erro ao acessar um link.

## Rodar

```bash
npm run dev
```

API em `http://localhost:4000`.

## Endpoints

- `GET /api/health` — healthcheck
- `POST /api/orders` — criar pedido (body: originalUrl, productDescription, quantity, cep; opcional: productTitle, productImage)
- `GET /api/orders/:id` — buscar pedido
- `PATCH /api/orders/:id/status` — atualizar status (body: { status }) — use ao confirmar pagamento
- `GET /api/recent-purchases` — compras recentes (PAGO/EM_ENVIO/CONCLUIDO) para barra na home
- `GET /api/product/preview?url=...` — scraping do produto (título, preço, imagens, variantes)
- `GET /api/price/preview?url=...` — preço estimado em BRL (simulado)
- `POST /api/orders/:id/quote` — registrar cotação (admin)

## Scraping

O preview de produto usa Playwright (Chromium) para abrir o link, carregar a página e extrair título, preço em CNY, imagens e opções de cor/tamanho. Sites chineses podem bloquear IPs fora da China; para produção, considere usar um proxy na China.
