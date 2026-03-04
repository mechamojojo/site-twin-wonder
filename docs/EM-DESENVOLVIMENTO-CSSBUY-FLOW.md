# Em desenvolvimento: fluxo via CSSBuy

## Ideia

1. **Usuário cola link** (Taobao, 1688, Weidian, etc.)
2. **Por trás**: enviamos esse link ao CSSBuy e obtemos a página do produto no CSSBuy
3. **Scraping**: fazemos scraping da página CSSBuy (que já tem seleção estruturada: cores, tamanhos, preços, estoque)
4. **UX clonada**: mostramos ao usuário uma página igual à do CSSBuy — seleção de cor com miniaturas, tamanhos com preço/estoque/quantidade por linha
5. **Após seleção**: replicamos a compra no CSSBuy (por enquanto: admin copia; futuro: API ou extensão)

## Por que via CSSBuy?

- **Dados estruturados**: A página CSSBuy já parseou o produto — mostra cor, tamanho, preço em CNY/USD, estoque
- **Layout limpo**: Menos anti-bot que Taobao/1688 direto
- **Mesma fonte**: Quando o admin for comprar, usa o mesmo produto na CSSBuy — sem risco de divergência
- **Quantidade por tamanho**: CSSBuy permite "2x M, 1x L" — nosso fluxo hoje tem quantidade única

## Fases

### Fase 1: Obter URL CSSBuy a partir do link original ✅

**Fluxo implementado:**
- **SEMPRE** passar pelo CSSBuy para ver as opções (cor, tamanho, fabric, etc.)
- Se o link já é CSSBuy (item-1688-xxx, item-micro-xxx, etc.) → scrape direto
- Se o link é 1688/Taobao/TMall/Weidian → **converte** para URL CSSBuy → scrape CSSBuy
- Conversão: `detail.1688.com/offer/123.html` → `cssbuy.com/item-1688-123.html`
- Fallback: marketplaces sem conversão (ex.: Goofish) → scrape direto

---

### Fase 2: Scraper da página produto CSSBuy

Criar `backend/src/scraper/cssbuyProductPreview.ts`:

**Extrair:**
- Imagem principal + galeria de cores (miniaturas)
- Cores: nome + thumbnail por cor
- Tamanhos: M, L, XL, 2XL
- Por tamanho: preço CNY, preço USD, estoque (inventory)
- Seletor de quantidade por tamanho (estilo CSSBuy: - / 0 / + por linha)

**Estrutura de retorno** (compatível com `ProductPreviewResult` + extensões):
```ts
interface CssbuyProductPreview {
  title: string;
  images: string[];
  colors: { name: string; image: string }[];
  sizes: {
    name: string;
    priceCny: number;
    priceUsd?: number;
    inventory: number;
    quantity: number; // 0 por padrão, usuário altera
  }[];
  cssbuyUrl: string;  // para admin abrir direto
  originalUrl: string;
}
```

---

### Fase 3: UX de seleção estilo CSSBuy (incrementar o que já temos)

**Manter o estilo visual atual** da página de pedido. **Incrementar** a usabilidade:

- **Cores**: já temos grid com miniaturas ✓
- **Tamanhos**: **novo** — quando houver tamanhos, mostrar cada um como linha com:
  - Nome do tamanho | Preço | Estoque (quando disponível)
  - Seletor de quantidade (- 0 +) **por tamanho** (estilo CSSBuy)
- **Total**: "Quantidade: X" em destaque (verde)
- **Payload**: passar `quantityBySize: { M: 2, L: 1 }` em notas/variação para o admin replicar no CSSBuy

---

### Fase 4: Replicar compra no CSSBuy

- **Atual**: Admin copia dados e cola no CSSBuy (já existe)
- **Futuro**: 
  - Chrome extension que preenche o formulário
  - Ou: contato CSSBuy para API/dropshipping

---

## Checklist de implementação

- [x] Fase 1: Conversão de URL CSSBuy → marketplace (fallback)
- [x] Fase 2: Scraper `cssbuyProductPreview.ts` — quando URL é link direto CSSBuy (item-1688-xxx.html), fazemos scraping da própria página CSSBuy (Playwright aguarda renderização)
- [x] Fase 2: Detecção automática — se URL contém cssbuy.com e item-X-ID.html, usa scraper CSSBuy; se falhar, fallback para 1688
- [x] Fase 3: Componente de seleção estilo CSSBuy — cores em grid, tamanhos com quantidade por linha (- 0 +)
- [x] Fase 3: Payload com `quantityBySize`, `productColor`, `productSize` para replicação exata
- [x] Fase 4: "Copiar para CSSBuy" — formato: Cor: X | Tamanhos: M x2, L x1

---

## Notas

- **Sem push para GitHub** até validar cada fase
- CSSBuy pode mudar layout — scraper pode precisar de manutenção
- Considerar cache do preview CSSBuy (evitar requisições repetidas)
