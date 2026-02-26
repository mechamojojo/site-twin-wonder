# Scraper e integração CSSBuy

## Links suportados (mesmos que a CSSBuy aceita)

O ComprasChina suporta os mesmos links que a CSSBuy:

- **1688** – JSON completo (imagens, preço, opções)
- **Taobao** – JSON (title, price, pic_url, auctionImages)
- **TMALL** – mesma base do Taobao
- **Weidian** – JSON + DOM (mainPic, picList, galeria)
- **Goofish** (闲鱼) – JSON Taobao-like + DOM
- **JD.com** – DOM
- **Pinduoduo** – DOM
- **Dangdang** – DOM
- **VIP Shop** – DOM

Se a URL tiver domínio CSSBuy com `?url=` ou `?link=` apontando para um link de marketplace, o scraper usa automaticamente esse link interno.

---

# Conectar o ComprasChina à solução de fulfillment da CSSBuy

O site hoje já menciona a CSSBuy (“Powered by CSSBuy”) e coleta pedidos (carrinho, página de pedido). Para **conectar de fato** o fluxo ao fulfillment da CSSBuy, use as opções abaixo.

---

## 1. O que a CSSBuy oferece

- **Buy For Me** – compra por link (o que seu site já “prepara” ao mostrar produto e preço).
- **Dropshipping / Fulfillment** – solução para lojistas: armazenagem, sincronização de estoque, pick & pack e envio ao cliente final.
- **Ship For Me** – envio a partir do endereço deles na China.

Não há **documentação pública de API** da CSSBuy. A integração técnica (envio automático de pedidos, tracking, etc.) depende de acordo comercial e do que a CSSBuy disponibilizar para parceiros.

---

## 2. Passos recomendados para integração

### A) Contato comercial / suporte

1. **Página de contato**  
   https://www.cssbuy.com/service  

2. **Dropshipping / fulfillment**  
   https://www.cssbuy.com/dropshipping  
   - Eles falam em “Custom Order Fulfillment Solution” e “Upgrade To Dropshipping Account”.
   - Use esse canal para perguntar:
     - Parceria para o ComprasChina (site brasileiro que envia pedidos para eles).
     - Se existe **API ou integração** para:
       - Enviar pedidos (link do produto, variante, quantidade, endereço de entrega).
       - Consultar status e tracking.
     - Condições para conta Dropshipping / parceiro (mínimos, taxas, suporte técnico).

3. **Outros canais**  
   - Discord: https://discord.com/invite/cssbuy  
   - E-mail/chat no site (seção “Contact us”).

### B) O que pedir no contato

- “Quero integrar meu site (ComprasChina) ao fulfillment da CSSBuy: envio de pedidos a partir dos links (1688, Taobao, etc.) e, se possível, tracking.”
- “Existe API REST ou documentação para parceiros / dropshipping?”
- “Há fluxo recomendado para um site que coleta o link + opções + endereço e repassa o pedido para a CSSBuy?”

Assim você descobre se há API, webhooks ou processo manual (ex.: planilha, painel) para enviar os pedidos.

---

## 3. Enquanto não houver API

- **Fluxo manual**  
  - Seu site continua coletando: link, variante, quantidade, endereço, observações.  
  - Você (ou sua equipe) replica o pedido na CSSBuy (Buy For Me / conta Dropshipping), usando o link e os dados salvos.

- **Fluxo semi-automático**  
  - Botão “Comprar” / “Adicionar ao carrinho” pode gerar um resumo (por exemplo, e-mail ou planilha) com todos os dados do pedido.  
  - Alguém usa esse resumo para abrir o link na CSSBuy e preencher o formulário deles.

- **Redirecionamento**  
  - Opcional: além de salvar no carrinho, mostrar um link “Abrir este produto na CSSBuy” (por exemplo, `https://www.cssbuy.com/buyforme` ou a URL que eles indicarem para colar o link). O cliente pode terminar a compra lá se preferir.

---

## 4. Se a CSSBuy oferecer API depois

Quando (e se) eles disponibilizarem API ou integração para parceiros, o backend do ComprasChina pode:

1. **Enviar pedidos**  
   - Endpoint do tipo “criar pedido” com: URL do produto, opções (cor/tamanho), quantidade, endereço de entrega, observações.

2. **Status e tracking**  
   - Endpoint para consultar status do pedido e número de rastreio; mostrar na página “Meus pedidos” ou por e-mail.

3. **Autenticação**  
   - Usar as credenciais (API key, OAuth, etc.) que a CSSBuy fornecer para parceiros/dropshipping.

Isso exigiria um novo módulo no backend (ex.: `backend/src/services/cssbuy.ts`) e possivelmente armazenar no banco o `orderId` retornado pela CSSBuy para cada pedido.

---

## 5. Resumo

| Objetivo                         | Ação principal                                                |
|----------------------------------|----------------------------------------------------------------|
| Saber se existe API/integração   | Contato em cssbuy.com/service e em cssbuy.com/dropshipping    |
| Pedir parceria / conta especial  | Dropshipping + perguntar por integração para “site parceiro”  |
| Operar sem API                   | Coletar pedidos no site e replicar manualmente na CSSBuy     |

Assim você consegue conectar o ComprasChina à solução de fulfillment da CSSBuy na medida do que eles oferecerem (API ou processo manual), e evoluir para integração automática quando houver oferta técnica por parte deles.
