# Checklist antes de ir ao ar — ComprasChina

Use esta lista para conferir o que já está pronto e o que falta antes de colocar o site no ar.

---

## 1. Variáveis de ambiente

### Backend (Render / servidor da API)

No painel do seu hosting, confira:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL do PostgreSQL de produção |
| `JWT_SECRET` | Sim | String aleatória longa (ex: `openssl rand -base64 32`) |
| `ADMIN_SECRET` | Sim | Senha forte para acessar `/admin` |
| `SITE_URL` | Sim | `https://compraschina.com.br` (domínio do site) |
| `CORS_ORIGINS` | Sim | Origens do front (ex: `https://compraschina.com.br,https://www.compraschina.com.br`) |
| `MP_ACCESS_TOKEN` | Sim | Token de produção do Mercado Pago (não use de teste em produção) |
| `RESEND_API_KEY` | Sim | API Key do Resend (e-mails de confirmação e recuperação de senha) |
| `EMAIL_FROM` | Sim | Ex: `ComprasChina <noreply@compraschina.com.br>` (domínio verificado no Resend) |
| `TURNSTILE_SECRET_KEY` | Opcional | Se usar CAPTCHA no cadastro/esqueci senha |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Opcional | Notificações de pedidos no Telegram |

### Frontend (Vercel / build)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `VITE_API_URL` | Sim | URL da API em produção (ex: `https://compraschina-api.onrender.com`) |
| `VITE_MP_PUBLIC_KEY` | Sim | Chave **pública** de produção do Mercado Pago |
| `VITE_TURNSTILE_SITE_KEY` | Opcional | Se usar CAPTCHA (Site Key do Turnstile) |

---

## 2. Configuração do site (código)

Edite **`src/data/siteConfig.ts`** (ou use variáveis de ambiente se preferir):

- **`WHATSAPP_NUMBER`** — Número real com DDI (ex: `55679999966914`), sem `+`.
- **`CONTACT_EMAIL`** — E-mail de contato que aparece no rodapé e “Fale Conosco”.
- **`MP_PUBLIC_KEY`** — Pode vir de `VITE_MP_PUBLIC_KEY`; em produção use a chave pública de **produção** do MP.

---

## 3. Segurança

- [ ] **JWT_SECRET** e **ADMIN_SECRET** são fortes e **nunca** foram commitados no repositório.
- [ ] **.env** está no `.gitignore` e não sobe para o Git.
- [ ] Em produção o site e a API rodam em **HTTPS** (Render e Vercel já fornecem).
- [ ] **CORS_ORIGINS** contém só os domínios do seu front (sem `*` em produção).

---

## 4. E-mail

- [ ] Domínio do **EMAIL_FROM** está verificado no Resend (ex: `noreply@compraschina.com.br`).
- [ ] **SITE_URL** no backend é exatamente o domínio do site (ex: `https://compraschina.com.br`) para os links de confirmação e “esqueci senha” funcionarem.
- [ ] Testou criar conta e clicar no link de confirmação no e-mail em produção.
- [ ] Testou “Esqueci minha senha” e o link de redefinição.

---

## 5. Pagamento (Mercado Pago)

- [ ] No [painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app) a aplicação está em modo **Produção** (não “Teste”).
- [ ] **MP_ACCESS_TOKEN** no backend é o token de **produção**.
- [ ] **VITE_MP_PUBLIC_KEY** no frontend é a chave **pública** de **produção**.
- [ ] Fez pelo menos um pagamento de teste em produção (valor baixo) e conferiu o fluxo até “Pago”.

---

## 6. Banco de dados

- [ ] **DATABASE_URL** aponta para o PostgreSQL de **produção** (não o local).
- [ ] Rodou as migrations em produção: no deploy (Render) o `prisma migrate deploy` já roda; se usar outro host, rode manualmente uma vez.
- [ ] Tem um plano de **backup** do banco (ex: backup automático do provedor do Postgres).

---

## 7. Conteúdo e páginas legais

- [ ] **Termos de Serviço** e **Política de Privacidade** estão revisados e com o nome/contato corretos da empresa.
- [ ] Textos de rodapé, “Fale Conosco” e “Suporte” estão alinhados com o e-mail/WhatsApp reais.

---

## 8. SEO e redes sociais

- [ ] **index.html**: título, meta description e imagens (og:image, twitter:image) estão corretos para o domínio final.
- [ ] **robots.txt** existe em `public/` e permite indexação (`Allow: /`) onde fizer sentido.
- [ ] (Opcional) Adicionar **sitemap.xml** depois para as páginas principais.

---

## 9. Testes rápidos antes de anunciar

- [ ] Cadastro → e-mail de confirmação → login.
- [ ] Esqueci minha senha → e-mail → redefinir senha → login.
- [ ] Adicionar produto ao carrinho → checkout → pagamento (teste com valor baixo).
- [ ] Salvar produto (coração) → ver em “Produtos salvos”.
- [ ] Acesso ao **/admin** com ADMIN_SECRET e listagem de pedidos.
- [ ] Links do rodapé (Termos, Política, Fale Conosco, WhatsApp) abrindo corretamente.

---

## 10. Opcionais para depois

- **Cookie consent / LGPD**: se passar a usar analytics ou cookies não essenciais, considere um banner de consentimento.
- **Monitoramento**: Sentry (ou similar) para erros em produção.
- **Sitemap**: gerar `sitemap.xml` com as rotas principais para o Google.
- **Seção “Mais salvos”**: usar o endpoint `GET /api/products/most-saved` na home ou no Explorar.

---

## Resumo mínimo para abrir

1. Backend e front em produção com **todas** as variáveis obrigatórias preenchidas.
2. **SITE_URL**, **CORS_ORIGINS**, **RESEND** e **EMAIL_FROM** corretos para o domínio.
3. **Mercado Pago** em produção (token + chave pública).
4. **JWT_SECRET** e **ADMIN_SECRET** fortes e seguros.
5. Testes de: cadastro, confirmação de e-mail, esqueci senha, um pedido de teste e admin.

Quando tudo acima estiver conferido, o site está pronto para ir ao ar.
