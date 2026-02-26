# Automatização CSSBuy — O que é possível

## Situação atual

**CSSBuy não possui API pública** para submissão automática de pedidos. As buscas indicam que não há documentação de desenvolvedor ou integração programática.

---

## Opções viáveis

### 1. **Painel admin (recomendado)**

Criar uma tela interna que liste os pedidos PAGOS e facilite o preenchimento no CSSBuy:

- **Botão "Abrir CSSBuy Quick Buy"** — Abre `https://www.cssbuy.com/item.html` em nova aba (o link pode vir pré-preenchido se eles suportarem query params)
- **Botão "Copiar"** — Copia um bloco formatado para colar no formulário do CSSBuy:
  ```
  Link: [originalUrl]
  Título: [productDescription]
  Nota: Cor: [productColor] | Tamanho: [productSize] | [notes]
  Quantidade: [quantity]
  ---
  Destinatário: [customerName]
  CPF: [customerCpf]
  Endereço: [addressStreet], [addressNumber], [addressComplement]
  [addressNeighborhood], [addressCity]-[addressState] CEP: [cep]
  ```
- **Lista ordenada** — Pedidos PAGOS primeiro, com status e filtros

**Esforço:** Baixo — pode ser uma página simples no frontend ou até um script que gera um CSV/JSON para você consultar.

---

### 2. **Contatar o CSSBuy**

Vale a pena perguntar diretamente:

- Se existe API ou integração para revendedores
- Se o programa de **dropshipping** (que oferecem) inclui API ou envio em lote
- Se há planos para integração com e-commerces

Contato: https://www.cssbuy.com/service  
Ou Discord: https://discord.com/invite/cssbuy

---

### 3. **Automação de navegador (avançado)**

Usar **Puppeteer** ou **Playwright** para:

- Fazer login no CSSBuy
- Preencher e submeter o formulário de compra automaticamente

**Riscos:** Pode violar os termos de uso do CSSBuy, quebrar a qualquer mudança no site, e enfrentar captchas ou proteções anti-bot.

**Uso:** Só como experimento interno, com consciência dos riscos.

---

### 4. **Chrome extension**

Criar uma extensão que:

- Lê os pedidos de uma API ou JSON
- Ao abrir o CSSBuy Quick Buy, preenche os campos automaticamente

**Esforço:** Médio. Funciona enquanto o layout do CSSBuy Quick Buy não mudar.

---

## Recomendação

1. **Curto prazo:** Implementar um **painel admin** com lista de pedidos e botão “Copiar para CSSBuy”, reduzindo a cópia manual de dados.
2. **Médio prazo:** Contatar o CSSBuy sobre API ou ferramentas para revendedores.
3. **Se surgir API:** Integrar no backend para envio automático de pedidos ao CSSBuy.
