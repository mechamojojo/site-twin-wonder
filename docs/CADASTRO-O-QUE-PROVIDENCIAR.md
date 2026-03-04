# Cadastro completo — O que você precisa providenciar

Para ativar **confirmação de e-mail**, **recuperação de senha**, **aceite de Termos/Política** e **proteção com CAPTCHA + rate limit**, configure o seguinte.

---

## 1. E-mail transacional (confirmação de e-mail + “Esqueci minha senha”)

O backend precisa enviar e-mails (link de confirmação e link de redefinição de senha).

### Opção A: Resend (recomendado — simples e free tier) ✅

1. Crie uma conta em [resend.com](https://resend.com).
2. Adicione e verifique seu domínio (ou use o domínio de teste `onboarding@resend.dev` só para desenvolvimento).
3. Em **API Keys**, crie uma chave e copie.
4. No `.env` do **backend** (`site-twin-wonder/backend/.env`):
   ```env
   RESEND_API_KEY=re_sua_chave_aqui
   EMAIL_FROM="ComprasChina <noreply@compraschina.com.br>"
   SITE_URL=https://compraschina.com.br
   ```
   Em desenvolvimento, se não tiver domínio próprio, use:
   ```env
   EMAIL_FROM="ComprasChina <onboarding@resend.dev>"
   SITE_URL=http://localhost:5173
   ```

### Opção B: SendGrid / Mailgun / AWS SES

Se preferir outro provedor, avise e adaptamos o código para usar a API deles. Você precisará fornecer:

- API key (ou credenciais SMTP)
- E-mail remetente e nome (`EMAIL_FROM`)
- `SITE_URL` (URL do site para montar links nos e-mails)

---

## 2. CAPTCHA (Cloudflare Turnstile)

Para reduzir cadastros e “esqueci senha” feitos por bots.

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com) e entre na sua conta (ou crie uma).
2. No menu lateral: **Turnstile** (ou acesse [turnstile.cloudflare.com](https://turnstile.cloudflare.com)).
3. **Add site**:
   - Nome: ex. `ComprasChina`
   - Domínio: em dev use `localhost`; em produção, seu domínio (ex. `compraschina.com.br`).
   - Widget: **Managed** (recomendado).
4. Anote:
   - **Site Key** (pública — vai no frontend).
   - **Secret Key** (privada — só no backend).
5. Variáveis de ambiente:
   - **Frontend** (`.env` na raiz do `site-twin-wonder` ou no painel da Vercel):
     ```env
     VITE_TURNSTILE_SITE_KEY=0x4AAAAAAAxxxxxxxxxx
     ```
   - **Backend** (`.env` do backend):
     ```env
     TURNSTILE_SECRET_KEY=0x4AAAAAAAxxxxxxxxxx_secret
     ```

Se não configurar as chaves, o cadastro e o “Esqueci minha senha” continuam funcionando; o CAPTCHA só não será exibido/validado.

---

## 3. Termos de Serviço e Política de Privacidade

Não é preciso providenciar nada externo. As páginas já existem:

- `/termos-de-servico`
- `/politica-de-privacidade`

Só será adicionado um checkbox no formulário de cadastro (“Li e aceito os Termos e a Política de Privacidade”) e, opcionalmente, o registro da data de aceite no banco.

---

## 4. Rate limiting (limite de requisições)

Será usado **rate limit em memória** no backend (ex.: limite de cadastros e “esqueci senha” por IP).  
Não é necessário criar conta nem chave em nenhum serviço.  
Se no futuro você usar várias instâncias do backend e quiser limite global, aí sim podemos usar Redis; você precisaria de uma URL `REDIS_URL`.

---

## Resumo — checklist

| Item                    | O que fazer                                                                 | Variáveis (backend)                    | Variáveis (frontend)           |
|-------------------------|-----------------------------------------------------------------------------|----------------------------------------|--------------------------------|
| E-mail (Resend)         | Conta Resend, API key, e-mail remetente, domínio (ou uso de teste)         | `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL` | —                               |
| CAPTCHA (Turnstile)     | Conta Cloudflare, criar widget Turnstile, pegar Site Key e Secret Key      | `TURNSTILE_SECRET_KEY`                 | `VITE_TURNSTILE_SITE_KEY`      |
| Termos/Política         | Nada                                                                       | —                                      | —                               |
| Rate limiting           | Nada (em memória)                                                          | —                                      | —                               |

Depois de configurar o que for usar (e-mail e/ou Turnstile), reinicie o backend e, se alterar variáveis do frontend, gere de novo o build ou recarregue o ambiente de desenvolvimento.
