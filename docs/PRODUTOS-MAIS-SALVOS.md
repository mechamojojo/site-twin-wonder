# Produtos mais salvos (likes)

O backend expõe as informações de quantas pessoas salvaram cada produto, para você poder mostrar "Mais salvos" no site.

## Endpoints

### Lista dos mais salvos
**`GET /api/products/most-saved?limit=20`** (público)

Retorna os produtos ordenados pela quantidade de usuários que os salvaram.

- **Query:** `limit` (opcional, default 20, máx. 50)
- **Resposta:**
  ```json
  {
    "items": [
      { "product": { "id", "slug", "title", "titlePt", "image", "priceCny", "priceBrl", ... }, "saveCount": 15 },
      ...
    ],
    "total": 20
  }
  ```

Use esse endpoint para montar uma seção **"Mais salvos"** ou **"Favoritos da galera"** na home ou no Explorar.

### Produto individual com contagem
**`GET /api/products/:slug`** (já existente)

A resposta passou a incluir **`saveCount`**: quantas pessoas salvaram aquele produto.

- **Exemplo:** `{ "id": "...", "slug": "...", "title": "...", "saveCount": 7, ... }`

Você pode mostrar na página do produto algo como: *"7 pessoas salvaram este item"*.

## Exemplo de uso no frontend

- **Seção "Mais salvos":** chamar `GET /api/products/most-saved?limit=8` e exibir os `items` em um carrossel ou grid (reutilizando o mesmo card de produto).
- **Página do produto:** usar o `saveCount` da resposta para exibir o texto "X pessoas salvaram" (ou esconder se for 0).
