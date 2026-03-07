import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { whatsAppUrl } from "@/data/siteConfig";

const faqs = [
  {
    question: "Preciso pagar imposto de importação?",
    answer: "Compras de até US$ 50 (para pessoa física) enviadas por transportadoras habilitadas são isentas de Imposto de Importação. Acima desse valor, pode incidir taxação da Receita Federal. Orientamos sobre isso antes do envio e trabalhamos com métodos que maximizam suas chances de isenção.",
  },
  {
    question: "Quanto tempo leva a entrega?",
    answer: "Depende do método de envio escolhido. O FJ-BR-EXP (mais popular) leva entre 12 e 30 dias úteis. Temos também opções econômicas (15-40 dias) e marítima para volumes maiores (40-60 dias). O prazo começa a contar após a compra ser confirmada no armazém.",
  },
  {
    question: "É seguro? Como sei que meu pedido chegou?",
    answer: "100% rastreado. Você recebe o código de rastreio assim que o pacote é despachado e acompanha cada etapa — do armazém na China ao seu CEP. Nossa equipe faz inspeção de qualidade com fotos antes de enviar, então você sabe exatamente o que está vindo.",
  },
  {
    question: "Quais marketplaces chineses posso usar?",
    answer: "Taobao, 1688, Weidian, TMALL, Pinduoduo, JD.com e muitos outros. Cole o link do produto na barra de busca e pronto — nós abrimos, conferimos e processamos o pedido para você.",
  },
  {
    question: "Posso pagar em reais? Quais formas de pagamento?",
    answer: "Sim, tudo em reais. Aceitamos PIX (à vista com desconto), boleto bancário e cartão de crédito. Nenhuma necessidade de conta no exterior ou cartão internacional.",
  },
  {
    question: "E se o produto chegar com defeito ou diferente do anúncio?",
    answer: "Fazemos inspeção de qualidade e fotos antes do envio. Se mesmo assim o produto chegar com defeito ou diferente do anunciado, nossa equipe entra em contato com o vendedor e tratamos o caso. Cada situação é analisada individualmente.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 bg-section-alt">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">Tire suas dúvidas</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">Perguntas Frequentes</h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            As dúvidas mais comuns de quem está comprando da China pela primeira vez.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`bg-background rounded-2xl border overflow-hidden shadow-card transition-all duration-300 ${
                openIndex === i ? "border-china-red/30 shadow-card-hover" : "border-border"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-heading font-bold text-foreground text-sm">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-china-red to-gold text-white text-xs font-bold mr-3 shrink-0">
                    {i + 1}
                  </span>
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ml-4 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-60" : "max-h-0"}`}>
                <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed pl-16">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <p className="text-muted-foreground mb-4">Ainda tem dúvidas? Nossa equipe responde rapidinho.</p>
          <a
            href={whatsAppUrl("Olá! Tenho uma dúvida sobre compras da China.")}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-china-red text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-china-red/90 transition-colors shadow-md"
          >
            Falar no WhatsApp →
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
