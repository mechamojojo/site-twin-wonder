# Deploy ComprasChina — Vercel + Railway

Guia para publicar o site em **compraschina.com.br** usando Vercel (frontend) e Railway (backend + banco).

---

## Resumo

| Serviço | O que faz |
|---------|-----------|
| **Vercel** | Frontend React (HTML, CSS, JS) |
| **Railway** | API Express + PostgreSQL |

O frontend chama a API pela URL do Railway configurada em `VITE_API_URL`.

**URLs atuais (teste):**
- Frontend: https://compraschinatest.vercel.app
- Backend: https://site-twin-wonder-production.up.railway.app

---

## 1. Backend no Railway

### 1.1 Criar projeto

1. Acesse [railway.app](https://railway.app) e faça login (GitHub).
2. **New Project** → **Deploy from GitHub repo** → selecione o repositório.

### 1.2 Configurar o serviço Backend

1. Após criar o projeto, adicione **PostgreSQL** (Add Plugin → PostgreSQL).
2. Clique no serviço do repositório (backend).
3. **Settings** → **Root Directory**: `backend`.
4. O Railway detecta Node.js e usa o `railway.toml` na pasta `backend`.

### 1.3 Variáveis de ambiente (Railway)

Em **Variables** do serviço backend, configure:

| Variável | Obrigatório | Valor | Onde pegar |
|----------|-------------|-------|------------|
| `DATABASE_URL` | ✅ | `${{Postgres.DATABASE_URL}}` | Referência automática ao Postgres (Railway) |
| `MP_ACCESS_TOKEN` | ✅ | `APP_USR-xxx...` | [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) > Credenciais |
| `CORS_ORIGINS` | ✅ | `https://compraschina.com.br,https://www.compraschina.com.br` | Domínios do frontend (separados por vírgula) |
| `ADMIN_SECRET` | ✅ | Senha forte (20+ chars) | Senha para acessar /admin — use `openssl rand -base64 24` |
| `JWT_SECRET` | ✅ | Chave aleatória (32+ chars) | Autenticação de clientes — use `openssl rand -base64 32` |
| `SITE_URL` | ✅ | `https://compraschina.com.br` | URL do site (links no Telegram) |
| `NODE_ENV` | — | `production` | Railway define automaticamente |
| `TELEGRAM_BOT_TOKEN` | Opcional | Token do @BotFather | Notificações de novos pedidos |
| `TELEGRAM_CHAT_ID` | Opcional | Seu chat_id | Obtido via getUpdates |
| `PORT` | ✅ | `8080` | **Obrigatório para 502**: Railway usa 8080. Defina e configure o domínio Target Port = 8080 |

### 1.4 Domínio no Railway

1. **Settings** do serviço backend → **Networking** → **Generate Domain**.
2. Anote a URL gerada (ex.: `compraschina-api-production.up.railway.app`).

### 1.5 Deploy

- O Railway faz deploy automático a cada push no branch configurado.
- Aguarde o primeiro deploy terminar e verifique se o healthcheck responde:  
  `https://sua-url.railway.app/api/health`

### 1.6 Memória (se o backend ficar sem memória)

O endpoint `/api/product/preview` usa scraping (Playwright) e pode consumir bastante RAM quando muitos usuários abrem vários produtos ao mesmo tempo. Se o serviço ficar sem memória (OOM):

1. No Railway: abra o **projeto** → clique no **serviço backend** → **Settings** → **Resources** (ou **Usage**).
2. Aumente a **memória** do plano (ex.: upgrade para um plano com mais RAM ou ajuste o limite do serviço, se disponível no seu plano).
3. O código já limita: lista de produtos (máx. 500 por request), cache de preview (80 entradas) e o frontend carrega menos produtos por página (300), reduzindo picos de uso.

---

## 2. Frontend na Vercel

### 2.1 Importar projeto

1. Acesse [vercel.com](https://vercel.com) e faça login (GitHub).
2. **Add New** → **Project** → importe o repositório.
3. A Vercel usa o `vercel.json` na raiz do repositório.

### 2.2 Variáveis de ambiente (Vercel)

Em **Settings** → **Environment Variables**:

| Variável | Valor | Ambiente |
|----------|-------|----------|
| `VITE_API_URL` | `https://sua-url.railway.app` | Production, Preview |
| `VITE_MP_PUBLIC_KEY` | `APP_USR-xxx...` | Production, Preview |

Use a URL real do Railway em `VITE_API_URL`.

### 2.3 Deploy

- O deploy é automático em cada push.
- Depois do deploy, o site ficará em algo como: `seu-projeto.vercel.app`.

---

## 3. Domínio compraschina.com.br

### 3.1 Na Vercel

1. **Settings** → **Domains** → **Add**.
2. Adicione `compraschina.com.br` e `www.compraschina.com.br`.
3. A Vercel mostra os registros DNS a configurar.

### 3.2 No Registro.br (ou seu provedor DNS)

Configure conforme indicado pela Vercel, por exemplo:

| Tipo | Nome | Valor |
|------|------|-------|
| **A** | `@` | IP da Vercel (ex.: 76.76.21.21) |
| **CNAME** | `www` | `cname.vercel-dns.com` |

A propagação pode levar até 48h.

### 3.3 Atualizar CORS no Railway

Depois de configurar o domínio, adicione na variável `CORS_ORIGINS`:

```
https://compraschina.com.br,https://www.compraschina.com.br
```

---

## 4. Mercado Pago

1. Em [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app), abra a sua aplicação.
2. **Produção** → configure URLs permitidas, se necessário.
3. Para Checkout Transparente (PIX e cartão), normalmente não há restrição de domínio, mas confira na documentação do app.

---

## 5. Webhook Mercado Pago (PIX assíncrono)

Para PIX pago depois do QR Code, configure no [painel do MP](https://www.mercadopago.com.br/developers/panel/app):

- URL: `https://sua-url.railway.app/api/webhooks/mercadopago`
- Evento: Pagamentos

Veja [MERCADO-PAGO.md](MERCADO-PAGO.md) e [TELEGRAM-E-WEBHOOK.md](TELEGRAM-E-WEBHOOK.md).

---

## 6. Checklist final

- [ ] Backend no Railway com todas as variáveis obrigatórias
- [ ] `JWT_SECRET` e `ADMIN_SECRET` fortes (nunca use valores de exemplo)
- [ ] Backend respondendo em `https://sua-url.railway.app/api/health`
- [ ] Frontend na Vercel com `VITE_API_URL` e `VITE_MP_PUBLIC_KEY` configurados
- [ ] Domínio `compraschina.com.br` apontando para a Vercel
- [ ] `CORS_ORIGINS` no Railway incluindo o domínio do site
- [ ] Webhook MP configurado (para PIX pago depois)
- [ ] `.env` e `.env.local` no .gitignore (nunca commitar credenciais)
- [ ] Testar fluxo completo: cadastro → pedido → checkout → pagamento

---

## Troubleshooting

| Problema | Possível causa |
|----------|----------------|
| **Application failed to respond** / 502 | 1) **Variables**: adicione `PORT=8080`. 2) **Target Port**: Settings → Networking → clique no domínio → **Target Port = 8080** (obrigatório). 3) Se ainda falhar, remova o domínio e gere novamente. |
| Erro de CORS | `CORS_ORIGINS` não inclui o domínio do frontend |
| 404 nas rotas | Vercel não está usando o `vercel.json`; confira o rewrite para `/index.html` |
| API não responde | Verifique `VITE_API_URL` e se o backend está rodando no Railway |
| PIX/Cartão falha | Confirme `MP_ACCESS_TOKEN` e `VITE_MP_PUBLIC_KEY` em produção |
| Backend sem memória (OOM) | Aumente a RAM do serviço no Railway (Settings → Resources). O código limita cache e listagens para reduzir picos. |
