# Telegram e Webhook Mercado Pago

## Telegram – Notificações de vendas

Quando configurado, você recebe no Telegram:
- **Novo pedido** – quando o cliente finaliza o checkout
- **Venda confirmada** – quando o pagamento é aprovado (cartão ou PIX via webhook)

### Configuração

1. **Criar um bot**
   - Abra o Telegram e busque por `@BotFather`
   - Envie `/newbot` e siga as instruções
   - Copie o **token** que ele retornar

2. **Obter o Chat ID**
   - Envie qualquer mensagem para o seu novo bot
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Procure por `"chat":{"id":123456789}` – esse número é o Chat ID

3. **Configurar no backend**
   - No `backend/.env` (ou variáveis de ambiente no Railway):
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Testar**
   - Crie um pedido de teste no site
   - A mensagem deve aparecer no Telegram

---

## Webhook Mercado Pago (PIX)

Para pagamentos PIX, o cliente pode pagar depois. O webhook atualiza o status do pedido quando o pagamento é confirmado.

### Configuração

1. **URL do webhook**
   - Produção: `https://seu-backend.railway.app/api/webhooks/mercadopago`
   - Aceita GET e POST com `topic=payment` e `id=<payment_id>`

2. **No painel do Mercado Pago**
   - Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)
   - Selecione sua aplicação
   - Vá em **Webhooks** ou **Notificações**
   - Adicione a URL: `https://seu-dominio.com/api/webhooks/mercadopago`
   - Marque o evento **Pagamentos**

3. **Comportamento**
   - Quando o PIX é pago, o MP envia a notificação
   - O backend busca os detalhes do pagamento na API do MP
   - Se estiver aprovado, atualiza o pedido para PAGO
   - Adiciona o produto ao catálogo e envia notificação no Telegram
