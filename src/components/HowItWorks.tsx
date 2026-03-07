import { Search, Wallet, PackageCheck, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Encontre o produto",
    description: "Navegue pelo nosso catálogo ou cole o link direto de qualquer produto no Taobao, 1688, Weidian ou TMALL.",
    link: { text: "Explorar produtos", href: "/explorar" },
  },
  {
    icon: Wallet,
    step: "02",
    title: "Pague em reais",
    description: "Sem cartão internacional, sem conta na China. Pague via PIX, boleto ou cartão de crédito e pronto.",
    link: null,
  },
  {
    icon: PackageCheck,
    step: "03",
    title: "Verificamos e embalamos",
    description: "Seu pedido chega ao nosso armazém, passamos por inspeção de qualidade e embalamos com cuidado para o Brasil.",
    link: null,
  },
  {
    icon: MapPin,
    step: "04",
    title: "Receba em casa",
    description: "Envio rastreado do China direto ao seu CEP. Você acompanha cada etapa em tempo real.",
    link: { text: "Ver opções de envio", href: "/#shipping" },
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-china-red uppercase tracking-widest">Simples assim</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">
            Da China para você em 4 passos
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Sem burocracia, sem surpresa. Só você escolhendo e a gente entregando.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-background border border-border hover:border-china-red/30 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
            >
              <span className="absolute top-4 right-4 text-5xl font-heading font-extrabold text-muted/60 select-none">
                {step.step}
              </span>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-china-red to-gold flex items-center justify-center mb-5 shadow-lg">
                <step.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-heading font-bold text-foreground text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>
              {step.link && (
                <Link to={step.link.href} className="text-sm text-china-red font-semibold hover:underline mt-auto">
                  {step.link.text} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
