# Checklist pré-produção — ComprasChina

Use este checklist antes de colocar o site no ar.

---

## 1. Segurança

### Credenciais
- [ ] **JWT_SECRET** — Obrigatório em produção. Gere com: `openssl rand -base64 32`
- [ ] **ADMIN_SECRET** — Senha forte (20+ caracteres). Evite palavras óbvias.
- [ ] **MP_ACCESS_TOKEN** — Use credenciais de **produção** do Mercado Pago (não teste).

### Arquivos
- [ ] **`.env`** está no `.gitignore` — nunca commitar credenciais.
- [ ] Verificar que não há `.env` no repositório: `git status` não deve listar `.env`.

---

## 2. Variáveis de ambiente

### Backend (Railway)
| Variável | Status |
|----------|--------|
| DATABASE_URL | Referência ao Postgres |
| MP_ACCESS_TOKEN | Credencial de produção |
| CORS_ORIGINS | Domínio do site (ex: https://compraschina.com.br) |
| ADMIN_SECRET | Senha forte |
| JWT_SECRET | Chave aleatória 32+ chars |
| SITE_URL | https://compraschina.com.br |
| TELEGRAM_BOT_TOKEN | Opcional |
| TELEGRAM_CHAT_ID | Opcional |

### Frontend (Vercel)
| Variável | Status |
|----------|--------|
| VITE_API_URL | URL do backend no Railway |
| VITE_MP_PUBLIC_KEY | Chave pública do Mercado Pago |

---

## 3. Mercado Pago

- [ ] Credenciais de **produção** configuradas.
- [ ] Webhook configurado: `https://seu-backend.railway.app/api/webhooks/mercadopago`
- [ ] Evento **Pagamentos** marcado no painel.

---

## 4. CORS

- [ ] `CORS_ORIGINS` inclui todos os domínios do frontend:
  - `https://compraschina.com.br`
  - `https://www.compraschina.com.br`
  - `https://seu-projeto.vercel.app` (se usar antes do domínio customizado)

---

## 5. Testes antes do go-live

- [ ] Criar conta (cadastro)
- [ ] Fazer login
- [ ] Adicionar produto ao carrinho
- [ ] Finalizar checkout (dados pré-preenchidos se logado)
- [ ] Testar PIX (valor mínimo)
- [ ] Verificar notificação no Telegram (se configurado)
- [ ] Acessar /admin e gerenciar pedido
- [ ] Ver rastreio em /pedido-confirmado/:id (após cadastrar)

---

## 6. O que NÃO fazer

- **Não** usar `compraschina` ou senhas óbvias como ADMIN_SECRET.
- **Não** deixar JWT_SECRET vazio ou com valor padrão em produção.
- **Não** commitar `.env` ou arquivos com tokens.
- **Não** usar credenciais de teste do MP em produção.

---

## Referências

- [Deploy Vercel + Railway](DEPLOY-VERCEL-RAILWAY.md)
- [Mercado Pago e Webhook](MERCADO-PAGO.md)
- [Telegram e Webhook](TELEGRAM-E-WEBHOOK.md)
