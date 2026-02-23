import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Quanto tempo a ComprasChina leva para processar meus pedidos?",
    answer: "Geralmente, processamos o pedido dentro de 24 horas após o pagamento ser confirmado.",
  },
  {
    question: "Como a ComprasChina lida com devoluções?",
    answer: "Desde que as condições de devolução sejam atendidas (o vendedor aceita devolução, o item está no armazém há menos de 7 dias e as taxas de frete de devolução são pagas), podemos ajudá-lo a devolver o item ao vendedor.",
  },
  {
    question: "Por quanto tempo posso armazenar meus itens no armazém?",
    answer: "Você pode armazenar seus itens em nosso armazém por 90 dias gratuitamente, a partir do status 'No Armazém'. Para estender o armazenamento após os 90 dias, cobramos uma pequena taxa de 15 yuans por pedido por mês.",
  },
  {
    question: "Quais marketplaces chineses são suportados?",
    answer: "Suportamos Taobao, 1688, Weidian, TMALL, Pinduoduo, JD.com e muitos outros. Basta colar o link do produto e nós cuidamos do resto.",
  },
  {
    question: "Posso pagar em reais (BRL)?",
    answer: "Sim! Aceitamos pagamentos em reais com diversas formas de pagamento populares no Brasil, incluindo PIX, boleto e cartão de crédito.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">Dúvidas</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">Perguntas Frequentes</h2>
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
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-china-red to-gold text-white text-xs font-bold mr-3">
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
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-40" : "max-h-0"}`}>
                <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed pl-16">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <p className="text-muted-foreground mb-4">Ainda tem dúvidas?</p>
          <a
            href="#"
            className="inline-block bg-china-red text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-china-red/90 transition-colors shadow-md"
          >
            Fale conosco hoje
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
