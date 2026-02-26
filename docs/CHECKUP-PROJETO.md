# Checkup do Projeto ComprasChina

Relatório de auditoria e otimização — fev/2025.

---

## Resumo

| Área | Status | Ação |
|------|--------|------|
| Performance frontend | ⚠️ Melhorável | Code splitting, remoção de deps não usadas |
| SEO & meta | ⚠️ Ajustes | lang pt-BR, OG image próprio |
| CSS | ⚠️ Warning | Ordem do @import (PostCSS) |
| Bundle | ✅ Razoável | ~449KB JS, 76KB CSS |
| Segurança backend | ✅ OK | CORS configurável, validação básica |
| Acessibilidade | ⚠️ Parcial | Alguns aria-labels; revisar formulários |

---

## 1. Performance Frontend

### 1.1 Bundle atual
- `index.js`: ~449 KB (138 KB gzip)
- `index.css`: ~76 KB (13 KB gzip)
- Imagens: hero ~189 KB, mockup ~27 KB

### 1.2 Dependências possivelmente não usadas
- **@tanstack/react-query** — `QueryClientProvider` no App, mas `useQuery`/`useMutation` nunca usados
- **Toaster (Radix)** — Duplicado com Sonner; páginas usam `toast` do Sonner

### 1.3 Code splitting
- Todas as rotas carregadas em bundle único
- **Recomendação**: `React.lazy()` para páginas secundárias (Login, Serviços, Termos, Política, Cart, Checkout, Pagar, Order, OrderConfirmed)

### 1.4 Imagens
- Hero e mockup em PNG/JPG — considerar WebP para menor peso
- Imagens de produtos externas: já usam `loading="lazy"` e `referrerPolicy`

---

## 2. SEO & Meta

| Item | Atual | Recomendação |
|------|-------|--------------|
| `html lang` | `en` | `pt-BR` (site em português) |
| `twitter:site` | `@Lovable` | `@ComprasChina` ou remover |
| OG image | URL Lovable/R2 | Imagem própria em compraschina.com.br |
| TODO no index | "Set the document title" | Remover (título já definido) |

---

## 3. CSS

### PostCSS warning
```
@import must precede all other statements (besides @charset or empty @layer)
```
O `@import` das fonts está **depois** de `@tailwind`. Deve vir **antes** ou usar `@layer` de forma compatível.

**Solução**: Mover `@import url('...fonts...')` para o topo do arquivo, antes de `@tailwind base`.

---

## 4. Componentes UI não utilizados

Estes componentes existem mas **não são importados** em nenhuma página:
- `chart` (recharts) — gráficos
- `calendar` (react-day-picker) — calendário
- `command` (cmdk) — command palette
- `drawer` (vaul) — drawer mobile
- `carousel` (embla-carousel) — carrossel
- `form` (react-hook-form) — formulários com validação
- `sidebar` — sidebar layout

**Nota**: Como não são importados, o Vite não os inclui no bundle. Podem ser mantidos para uso futuro ou removidos para limpeza.

---

## 5. Backend

- **CORS**: Configurável via `CORS_ORIGINS`
- **Validação**: Básica nos endpoints; considerar Zod para schemas mais rígidos
- **Rate limiting**: Não implementado — considerar para `/api/product/preview` e `/api/orders`
- **Webhook Mercado Pago**: Não implementado (status PIX atualizado só na resposta imediata)

---

## 6. Acessibilidade

- Navbar: `aria-label` em links principais
- Imagens de produto: `alt=""` (decorativas) — OK quando são thumbnails
- Formulários: labels associados; revisar mensagens de erro e foco

---

## 7. Melhorias implementadas

As seguintes correções foram aplicadas:

1. **CSS**: `@import` movido para antes de `@tailwind` — warning PostCSS eliminado
2. **React Query**: Removido do código (não utilizado). Para remover do package.json: `npm uninstall @tanstack/react-query`
3. **Toaster duplicado**: Removido Radix Toaster; mantido apenas Sonner
4. **Code splitting**: Rotas secundárias com `React.lazy()` + `Suspense` — chunk principal caiu de ~449KB para ~266KB (~40% menor)
5. **index.html**: `lang="pt-BR"`, remoção do TODO, `twitter:site` (@Lovable) removido

### Resultado do build (após otimizações)
- Chunk principal: 266 KB (87 KB gzip)
- Páginas em chunks separados: Index 32 KB, Checkout 28 KB, Order 21 KB, Pagar 10 KB, Cart 5 KB, etc.
