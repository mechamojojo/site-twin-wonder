# Fluxo de Fulfillment — CSSBuy

Como o pedido do cliente vira compra na China e entrega direta no Brasil.

---

## Visão do fluxo

```
Cliente (site) → escolhe produto, variante, paga BRL
       ↓
Você (admin) → recebe pedido PAGO, compra no CSSBuy
       ↓
CSSBuy → compra na China, recebe no warehouse, envia para endereço do cliente
       ↓
Cliente → recebe em casa (sob o nome dele, CPF na declaração de alfândega)
```

---

## O que o CSSBuy precisa para comprar

| Dado | Onde vem | Nota |
|------|----------|------|
| Link do produto | `originalUrl` | Já temos |
| Quantidade | `quantity` | Já temos |
| Cor / Tamanho / Estilo | `productColor`, `productSize`, `productVariation` | Precisa ser explícito para você selecionar no CSSBuy |
| Observações | `notes` | Já temos (ex: "sem etiqueta") |

---

## O que a alfândega/transportadora precisa (Brasil)

Para envio da China → Brasil, o pacote precisa:

| Dado | Obrigatório | Motivo |
|------|-------------|--------|
| **CPF** | ✅ Sim | Exigido desde 2020 pela Receita Federal. Sem CPF = devolução |
| Nome completo | ✅ Sim | Destinatário na etiqueta |
| Endereço completo | ✅ Sim | Rua, número, complemento, bairro, cidade, estado, CEP |
| Telefone | Recomendado | Algumas transportadoras exigem |

---

## Campos que vamos coletar no Checkout

### Já temos
- Nome, e-mail, WhatsApp, CEP
- Método de envio (FJ-BR-EXP, BR-EMS, BR-SEA)
- Descrição do produto com variantes (em texto)

### Novos (necessários para CSSBuy + alfândega)
- **CPF** (11 dígitos, apenas números)
- **Rua**
- **Número**
- **Complemento** (opcional: apt, bloco)
- **Bairro**
- **Cidade**
- **Estado** (UF)

O CEP pode preencher automaticamente rua, bairro, cidade, estado via **ViaCEP** (API gratuita) — melhor UX.

### Variantes estruturadas (opcional mas útil)
- `productColor`
- `productSize`
- `productVariation` (para opções genéricas tipo "versão A")

Assim você vê claramente no painel: "Cor: Vermelho | Tamanho: M".

---

## Ordem da coleta no Checkout

1. **CEP** → autopreenche endereço (ViaCEP)
2. **Endereço** (usuário confirma/ajusta se necessário)
3. **CPF**
4. **Nome, e-mail, WhatsApp**
5. **Método de envio, observações**

---

## Como aplicar as alterações

1. **Migration**: Com o PostgreSQL rodando, execute no backend:
   ```bash
   cd backend && npx prisma migrate deploy
   ```
   (Ou `npx prisma migrate dev` em desenvolvimento.)

2. Os dados passam a ser coletados no Checkout e salvos no `Order`.

## Exportação para CSSBuy (futuro)

Quando houver painel admin, você poderá:
- Ver lista de pedidos PAGOS
- Clicar "Copiar para CSSBuy" → preenche formulário ou gera texto com:
  - Link + quantidade + cor/tamanho
  - Endereço completo do cliente
  - CPF do destinatário
