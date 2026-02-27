# Deploy Backend no Render (alternativa ao Railway)

Se o Railway continuar com 502, use o Render — costuma funcionar melhor com Docker + Node.

## 1. Criar conta

1. Acesse [render.com](https://render.com) e faça login com GitHub.

## 2. Criar banco Postgres (se ainda não tiver)

- **Dashboard** → **New** → **PostgreSQL**
- Crie o banco e copie a **Internal Database URL** (para usar no Render) ou **External Database URL** (se o Postgres estiver no Railway, use a URL externa do Railway)

## 3. Criar Web Service

1. **New** → **Web Service**
2. Conecte o repositório GitHub (mechamojojo/site-twin-wonder)
3. Configure:
   - **Name:** compraschina-api
   - **Region:** Oregon (US West) ou o mais próximo
   - **Root Directory:** `backend`
   - **Runtime:** **Docker**
   - **Dockerfile Path:** `Dockerfile` (ou deixe vazio — procura em backend/)

## 4. Variáveis de ambiente

Em **Environment** adicione:

| Variável       | Valor                    |
|----------------|--------------------------|
| `DATABASE_URL` | URL do Postgres          |
| `CORS_ORIGINS` | `https://compraschinatest.vercel.app` |
| `ADMIN_SECRET` | Sua senha admin          |
| `JWT_SECRET`   | `openssl rand -base64 32` |
| `MP_ACCESS_TOKEN` | Token Mercado Pago     |
| `SITE_URL`     | `https://compraschina.com.br` |
| `NODE_ENV`     | `production`             |

## 5. Deploy

- Clique em **Create Web Service**
- O Render fará build e deploy
- Aguarde a URL (ex: `https://compraschina-api.onrender.com`)

## 6. Atualizar o frontend

Na Vercel, em **Environment Variables**, defina:

- `VITE_API_URL` = URL do Render (ex: `https://compraschina-api.onrender.com`)

## Observações

- **Free tier:** o serviço pode dormir após 15 min sem tráfego; o primeiro request pode levar ~1 min para “acordar”.
- **Build:** o build com Playwright pode levar alguns minutos.
- Se o Postgres estiver no Railway, use a **External** URL para o Render conseguir conectar.
