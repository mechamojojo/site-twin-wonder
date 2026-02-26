# Fluxo completo do site — ComprasChina

## Fluxo atual (funcionando)

1. **Cliente cola link** → `/pedido?url=...`
   - Vê produto, preço estimado em BRL, opções (cor/tamanho)
   - Adiciona ao carrinho

2. **Checkout** → Preenche endereço, CPF, contato
   - CEP autopreenche via ViaCEP
   - Submit cria o pedido **e gera cotação automática** (sem esperar admin)

3. **Pedido confirmado** → Botão "Pagar agora"
   - PIX ou cartão (Mercado Pago)

4. **Após o pagamento** → Status PAGO
   - Pedido fica disponível com todos os dados para fulfillment

5. **Você (admin)** → Compra no CSSBuy, envia direto ao cliente
   - Todos os dados: link, variante, endereço, CPF
   - Sem necessidade de avisar o cliente — basta cumprir o pedido

---

## O que está pronto

| Etapa | Status |
|-------|--------|
| Paste link → ver produto + preço | ✓ |
| Adicionar ao carrinho (cor/tamanho) | ✓ |
| Checkout com endereço completo + CPF | ✓ |
| Cotação automática (pagamento imediato) | ✓ |
| Pagamento PIX e cartão | ✓ |
| Dados do pedido para CSSBuy (link, variant, address, CPF) | ✓ |
| Painel admin | ✓ |
| Rastreio (admin cadastra → cliente vê em `/pedido-confirmado/:id`) | ✓ |
| Webhook Mercado Pago (PIX pago depois) | ✓ |
| Notificações Telegram (novo pedido + pagamento confirmado) | ✓ |

---

## Comunicação com o cliente (opcional)

- **Novo pedido / Pagamento** — Telegram avisa você; use o admin para gerenciar.
- **Rastreio** — Cadastre no admin; o cliente vê em `/pedido-confirmado/:id` e pode usar as mensagens prontas de WhatsApp (Pedido aceito, Rastreio, Negado).
