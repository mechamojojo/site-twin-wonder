# Integração com Compras do CSSBuy Discord

## Objetivo

Exibir no ComprasChina o que está sendo comprado na comunidade CSSBuy (via Discord), servindo como inspiração e tendências para os usuários.

---

## Opção 1: cssbuydiscord.com (recomendada)

O site **cssbuydiscord.com** já agrega os produtos populares do Discord do CSSBuy.

### O que temos
- **Hot** (mais vendidos): https://cssbuydiscord.com/hot
- **Categorias**: Shoes, Jackets, Clothing, T-shirts, Electronics, Bags, etc.
- **Página de detalhe**: título, preço USD, link CSSBuy, link Weidian original

### Exemplo de dado disponível
- Título: "Jordan 4 Retro (40 color)-0001"
- Preço: $35.71
- Popularidade: 53.6K
- **CSSBuy Link**: `https://www.cssbuy.com/item-micro-7388235958.html`
- Link Weidian original

### Implementação sugerida

1. **Backend** – criar `backend/src/services/cssbuyDiscordFinds.ts`:
   - Fetch periódico da página `/hot` e/ou categorias
   - Parse HTML para extrair: título, preço, link do detalhe, popularidade
   - Para cada item, fazer fetch do detalhe para obter a URL do CSSBuy
   - Persistir em tabela (ex.: `discord_finds`) com: title, priceUsd, cssbuyUrl, popularity, category, fetchedAt

2. **API** – endpoint `GET /api/discord-finds?category=hot&limit=20`
   - Retorna produtos mais populares para exibir no site

3. **Frontend** – seção "O que está bombando" ou "Compras da comunidade":
   - Grid de cards com imagem (via preview do CSSBuy), título, preço
   - Clique leva para `/pedido?url=...` com a URL do CSSBuy

4. **Job** – cron a cada X horas para atualizar a lista

### Vantagens
- Sem necessidade de bot no Discord
- Dados já agregados e estruturados
- Links CSSBuy prontos (compatíveis com nosso fluxo)

### Cuidados
- Respeitar ToS do cssbuydiscord.com (robots.txt, rate limit)
- Considerar cache para não sobrecarregar o site

---

## Opção 2: Bot no Discord (CSSBot / canal de compras)

O **CSSBot#3080** envia compras recentes para canais do Discord do CSSBuy.

### Requisitos

1. **Criar um bot no Discord**
   - Portal de desenvolvedores: https://discord.com/developers/applications
   - Gerar token do bot
   - Habilitar intents: `MESSAGE_CONTENT` (para ler o conteúdo das mensagens)

2. **Convidar o bot para o servidor CSSBuy**
   - É necessário ser admin ou ter permissão de convite no servidor
   - Link de convite com scopes: `bot`, permissões: `Read Message History`, `View Channels`

3. **Identificar o canal**
   - Descobrir o ID do canal onde o CSSBot posta as compras
   - Formato típico: embed ou mensagem com produto, preço, link

4. **Implementar o bot** (Node.js + discord.js):
   ```txt
   - Conectar ao Discord
   - Inscrever em eventos de mensagem no canal alvo
   - Ao receber mensagem, parsear (embed ou texto) para extrair:
     - Nome do produto
     - Preço
     - Link (CSSBuy, Weidian, etc.)
   - Enviar para API do ComprasChina: POST /api/discord-finds/ingest
   ```

5. **Backend** – endpoint para receber os dados do bot

### Desafios
- Depende de acesso ao servidor CSSBuy (convite do bot)
- Formato das mensagens do CSSBot pode mudar
- Manutenção contínua do parser

---

## Comparação

| Critério       | cssbuydiscord.com | Bot Discord |
|----------------|-------------------|-------------|
| Complexidade  | Baixa             | Média/Alta  |
| Dependências  | Fetch HTTP        | Bot, acesso ao servidor |
| Atualização   | Scraping periódico| Tempo real  |
| Controle      | Terceiro          | Nosso       |

---

## Recomendação

**Começar pela Opção 1 (cssbuydiscord.com)**:
- Implementação mais rápida
- Não depende de permissões no Discord
- Já fornece links CSSBuy compatíveis com o ComprasChina

Se no futuro for preciso de dados mais em tempo real, a Opção 2 pode ser adicionada.

---

## Próximos passos (Opção 1)

1. Criar modelo `DiscordFind` no Prisma (ou usar tabela existente de produtos em destaque)
2. Implementar scraper de cssbuydiscord.com
3. Criar endpoint `GET /api/discord-finds`
4. Adicionar seção no frontend (home ou página dedicada)
5. Configurar job de atualização (ex.: a cada 6h)
