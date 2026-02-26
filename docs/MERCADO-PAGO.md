# Integração Mercado Pago — Checkout Transparente

Configuração da API direta de pagamentos (Checkout Transparente) no ComprasChina.

## Credenciais necessárias

1. Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação (Nº 5993116239142363)
3. Em **Credenciais**, obtenha:
   - **Chave pública** (Public Key) — para o frontend
   - **Token de acesso** (Access Token) — para o backend (nunca expor ao cliente)

## Configuração

### Backend

No arquivo `backend/.env`:

```env
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Use o **Access Token de produção** para pagamentos reais. Para testes, use as credenciais de teste.

### Frontend

Para pagamento com **cartão**, crie `.env` na raiz do projeto:

```env
VITE_MP_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

A chave pública é usada para tokenizar os dados do cartão de forma segura no cliente. O **PIX funciona sem essa chave** — apenas o cartão precisa.

## Fluxo de pagamento

1. Cliente cria pedido → status `AGUARDANDO_COTACAO`
2. Admin adiciona cotação via `POST /api/orders/:id/quote` → status `AGUARDANDO_PAGAMENTO`
3. Cliente acessa `/pagar/:id` ou clica em "Pagar agora" em `/pedido-confirmado/:id`
4. Escolhe PIX ou cartão
5. **PIX**: informa e-mail → backend cria pagamento → exibe QR Code
6. **Cartão**: integração Cardform (ver documentação do MP) → token enviado ao backend
7. Pagamento aprovado → status `PAGO`, registro em `Payment`

## Endpoints

- `POST /api/orders/:id/create-payment` — cria pagamento no Mercado Pago

### Body (PIX)

```json
{
  "payment_method_id": "pix",
  "payer_email": "cliente@email.com",
  "payer_name": "Nome do Cliente"
}
```

### Body (Cartão)

```json
{
  "token": "ff8080814c11e237014c1ff593b2b000",
  "payment_method_id": "visa",
  "payer_email": "cliente@email.com",
  "payer_name": "Nome",
  "installments": 1,
  "issuer_id": "24"
}
```

O `token` é gerado pelo Cardform do Mercado Pago no frontend. A página `/pagar/:id` já inclui o Cardform integrado — basta configurar `VITE_MP_PUBLIC_KEY` no `.env`.

## Documentação oficial

- [Checkout Transparente](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/landing)
- [Integrar via Cardform](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/card/integrate-via-cardform)
- [API de Pagamentos](https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post)

## Webhooks — PIX e pagamentos assíncronos

O PIX pode ser pago alguns minutos depois do QR Code. Sem o webhook, o pedido só atualiza no fluxo direto (quando o cliente está na página). Com o webhook, o status `PAGO` é definido mesmo quando o cliente paga depois.

### Configuração no Mercado Pago

1. Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação
3. No menu à esquerda: **Webhooks** → **Configurar notificações**
4. Em **URL de notificações (produção)** informe:
   ```
   https://SEU-BACKEND.railway.app/api/webhooks/mercadopago
   ```
   (Substitua pela URL real do seu backend no Railway)
5. Marque o evento **Pagamentos** (payments)
6. Salve

O Mercado Pago enviará notificações quando o status de um pagamento mudar (ex.: PIX aprovado). O backend consulta a API do MP, confere se está aprovado e atualiza o pedido para `PAGO`, além de enviar notificação no Telegram. Veja também [Telegram e Webhook](TELEGRAM-E-WEBHOOK.md).
