# ComprasChina Backend

API em Node + Express + Prisma + PostgreSQL.

## Pré-requisitos

- Node 20+
- PostgreSQL
- Para **preview de produto** (`/api/product/preview`): Chromium do Playwright (em produção use a imagem Docker com Playwright; em local: `npx playwright install chromium`)

## Instalação

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
```

## Rodar

```bash
npm run dev
```

API em `http://localhost:4000`. Deploy: `npm run build` e `npm start` (ou Docker — ver `Dockerfile`).

## Scripts npm (só estes)

| Script   | Uso                          |
|----------|------------------------------|
| `dev`    | API em modo desenvolvimento  |
| `build`  | Gera Prisma client + `dist/` |
| `start`  | `node dist/index.js`         |

Manutenção pontual (rodar na pasta `backend` com `npx ts-node scripts/…`): arquivos em `scripts/` (export catálogo, seeds, etc.). **Sincronizar preços BRL em produção:** Admin → “Sincronizar preços BRL” (`POST /api/admin/catalog/resync-prices`).

## Endpoints

- `GET /api/health` — healthcheck
- `POST /api/orders` — criar pedido
- `GET /api/orders/:id` — buscar pedido
- `GET /api/product/preview?url=...` — scraping (requer Chromium)
- Ver código em `src/index.ts` para lista completa

## Scraping

O preview usa Playwright. Sites podem bloquear IPs fora da China; em produção use proxy se necessário.
