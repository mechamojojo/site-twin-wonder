# Sincronizar títulos do Admin (localhost) para produção

Os títulos que você edita no **Admin do localhost** ficam no banco local. Para que os mesmos nomes apareçam em **produção**, rode o script de sync.

## Pré-requisitos

1. **Backend local rodando** (na pasta `backend`: `npm run dev`).
2. **Banco local com os produtos** já editados no Admin.
3. **URL do backend de produção** (veja abaixo).
4. **Senha do admin em produção** igual à variável `ADMIN_SECRET` do backend em prod.

## Onde pegar a URL do backend em produção (PROD_API_URL)

A URL deve ser do **servidor da API** (Node/Express), **não** do site estático (frontend).

- **Railway:** no painel do projeto, abra o **serviço do backend** (o que sobe a API). Em **Settings** ou **Deployments** você vê a URL pública, algo como:
  - `https://site-twin-wonder-backend-production.up.railway.app`
  - ou o domínio que você configurou para esse serviço.
- A URL do **frontend** (ex.: `site-twin-wonder-production.up.railway.app`) muitas vezes serve só o site; a API pode estar em outro serviço com outra URL.
- Teste no navegador: `https://SUA-URL/api/admin/login` deve **não** ser uma página 404 (pode retornar 400 ou 405, mas não "Cannot GET").

## Como rodar

Na pasta **raiz do projeto** (onde está a pasta `scripts/`):

```bash
PROD_API_URL=https://URL-DO-BACKEND-DE-PRODUCAO \
ADMIN_SECRET=mesma_senha_do_admin_em_producao \
node scripts/sync-titles-to-prod.mjs
```

Se o seu backend local usa outra porta:

```bash
LOCAL_API_URL=http://localhost:4000 \
PROD_API_URL=https://URL-DO-BACKEND-DE-PRODUCAO \
ADMIN_SECRET=mesma_senha_do_admin_em_producao \
node scripts/sync-titles-to-prod.mjs
```

O script vai:

1. Fazer login no backend **local** e listar todos os produtos (com os títulos que você editou no Admin).
2. Fazer login no backend de **produção**.
3. Enviar para produção os títulos (e titlePt) de cada produto, identificando por **slug**.

Produtos que existem no local mas não em prod (slug diferente ou não existente) aparecem como "não encontrados"; os que batem são atualizados.

## Se der 404 em produção

- **Cannot GET /api/admin/login** → a URL é do **frontend** ou do serviço errado. Use a URL do **backend** (serviço da API no Railway).
- Confirme no Railway que o serviço do backend está deployado e que a variável `ADMIN_SECRET` está configurada igual à que você usa no comando.

## Alternativa: export + deploy

Se não tiver a URL do backend de produção acessível:

1. No **Admin local**, use a opção de **exportar para código** (gera `src/data/explorarProducts.export.json`).
2. Commite o arquivo e faça **deploy do frontend**. O site em produção já usa os títulos curados do código (RAW + export) para exibir os nomes; o sync via API é para atualizar o **banco** de produção quando você quer que os dados da API também fiquem iguais ao local.
