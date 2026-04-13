import { Link } from "react-router-dom";
import { Link as LinkIcon, Truck, MessageCircle } from "lucide-react";

const services = [
  {
    icon: LinkIcon,
    title: "Compre Por Mim",
    description: "Cole o link de qualquer produto de Taobao, 1688, Weidian ou TMALL e finalize em reais — nós compramos e entregamos na sua porta.",
    accent: "from-china-red to-china-red/70",
    href: "/servicos#compre-por-mim",
  },
  {
    icon: Truck,
    title: "Envie Por Mim",
    description: "Já comprou direto no site chinês? Direcione o pacote ao nosso armazém na China e nós enviamos para o Brasil por você.",
    accent: "from-gold to-gold/70",
    href: "/servicos#envie-por-mim",
  },
  {
    icon: MessageCircle,
    title: "Fale com o Vendedor",
    description: "Quer tirar uma dúvida antes de comprar? Entramos em contato direto com o vendedor e trazemos a resposta em português.",
    accent: "from-gold to-china-red",
    href: "/#contato",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="group relative bg-background rounded-2xl p-7 border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${service.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.accent} flex items-center justify-center mb-5 shadow-md`}>
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-heading font-bold text-foreground text-lg mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              <Link to={service.href} className="inline-block mt-4 text-sm text-china-red font-semibold hover:underline">
                Saiba mais →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
