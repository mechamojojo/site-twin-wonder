import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How long does CSSBuy take to handle my orders?",
    answer: "Usually, we fulfill the order within 24 hours after you have paid for the order.",
  },
  {
    question: "How does CSSBuy handle returns?",
    answer: "As long as the return conditions are met (select accepts return, item is in warehouse for less than 7 days, return shipping fees are paid), we can help you return the item to the seller.",
  },
  {
    question: "How long can I store my items in your warehouse?",
    answer: "You can store your items in our warehouse for 90 days for free, starting from the order status 'In Warehouse'. To extend your warehouse storage after the 90 days, we charge a small fee of 15 yuan per order per month.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-muted-foreground text-sm mb-2">Still have questions? View our Q&A below</p>
          <h2 className="text-3xl font-heading font-bold text-foreground">Q&A</h2>
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
            Still have questions that aren't answered above?
          </h3>
          <a
            href="#"
            className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Contact us today
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
