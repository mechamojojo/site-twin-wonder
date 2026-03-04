# Como montar um bom suporte pelo WhatsApp

Dicas práticas para atender bem pelo WhatsApp e deixar o link do site mais útil.

---

## 1. Use o WhatsApp Business

- **App:** [WhatsApp Business](https://www.whatsapp.com/business) (celular) — grátis, perfil comercial, mensagem de ausência, catálogo.
- **Número:** Preferência por um número **só para o negócio** (evita misturar com pessoal).
- **Perfil:** Foto da marca, nome “ComprasChina”, descrição curta (ex.: “Compre da China com facilidade. Atendimento em português.”), endereço do site.

---

## 2. Mensagem de boas-vindas (ausência)

No app: **Configurações → Negócio → Mensagem de ausência**.

Exemplo:

```
Olá! Você falou com a ComprasChina.

Em horário comercial respondemos em até algumas horas. Fora do horário, retornamos no próximo dia útil.

Enquanto isso: dúvidas sobre pedidos → meus-pedidos no site; compras → envie o link do produto.

Obrigado!
```

Ajuste o texto e o “horário comercial” como quiser.

---

## 3. Resposta rápida

- **Meta:** responder em até 1–2 horas em horário comercial (ex.: 9h–18h).
- Ative **notificações** do WhatsApp Business para não perder mensagens.
- Se não der para responder na hora, use a **mensagem de ausência** (acima).

---

## 4. Mensagem pré-preenchida no site

No site, o link do WhatsApp já abre com uma mensagem padrão (em `siteConfig.ts`):

- **`WHATSAPP_DEFAULT_MESSAGE`** — texto que o cliente vê ao clicar em “WhatsApp” no rodapé.

Sugestão: algo como *“Olá! Acessei o site ComprasChina e gostaria de mais informações.”*  
Assim o atendente já sabe que veio do site. Você pode mudar esse texto em **`src/data/siteConfig.ts`** quando quiser.

---

## 5. Respostas rápidas (atalhos)

No WhatsApp Business: **Configurações → Respostas rápidas**.

Crie atalhos para as dúvidas mais comuns, por exemplo:

- **/pedido** — “Para acompanhar seu pedido, acesse [site]/meus-pedidos com o e-mail que você usou no cadastro.”
- **/prazo** — “O prazo depende do envio: ePacket ~15–25 dias, marítimo ~30–60 dias. No pedido você vê a opção escolhida.”
- **/pagamento** — “Aceitamos Mercado Pago (cartão e PIX) na página de pagamento do pedido, após a cotação.”

Assim você responde mais rápido e mantém o padrão das informações.

---

## 6. Número no site

- Em **`src/data/siteConfig.ts`** deixe **`WHATSAPP_NUMBER`** com DDI + DDD + número, **sem** `+` ou espaços.  
  Ex.: Brasil: `55679999966914` (55 = Brasil, 67 = DDD, resto = número).

---

## 7. Uso do link em outras páginas

Onde precisar de “Fale no WhatsApp” com mensagem customizada:

```ts
import { whatsAppUrl } from "@/data/siteConfig";

// Link simples (abre sem texto)
<a href={whatsAppUrl()}>WhatsApp</a>

// Link com mensagem (ex.: página de pedido)
<a href={whatsAppUrl(`Olá! Meu pedido #${orderId} — preciso de ajuda.`)}>
  Falar no WhatsApp
</a>
```

Isso ajuda o suporte a saber de qual pedido ou contexto a pessoa está falando.

---

## Resumo

1. Usar **WhatsApp Business** e número dedicado.  
2. Configurar **mensagem de ausência** e **respostas rápidas**.  
3. Manter **WHATSAPP_NUMBER** e **WHATSAPP_DEFAULT_MESSAGE** corretos em `siteConfig.ts`.  
4. Responder em até 1–2h em horário comercial.  
5. Usar **whatsAppUrl(mensagem)** em links do site quando quiser contexto (ex.: número do pedido).
