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
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-muted-foreground text-sm mb-2">Ainda tem dúvidas? Veja nossas perguntas frequentes abaixo</p>
          <h2 className="text-3xl font-heading font-bold text-foreground">Perguntas Frequentes</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-background rounded-xl border border-border overflow-hidden shadow-card"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-foreground text-sm">
                  <span className="text-primary font-bold mr-2">0{i + 1}.</span>
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ml-4 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <h3 className="text-lg font-heading font-bold text-foreground mb-3">
            Ainda tem perguntas que não foram respondidas acima?
          </h3>
          <a
            href="#"
            className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Fale conosco hoje
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
