import { Link } from "react-router-dom";
import { ShoppingCart, Truck, MessageCircleQuestion } from "lucide-react";

const services = [
  {
    icon: ShoppingCart,
    title: "Compre Por Mim",
    description: "Compramos produtos de lojas online da China em seu nome",
    accent: "from-china-red to-china-red/70",
    href: "/servicos#compre-por-mim",
  },
  {
    icon: Truck,
    title: "Envie Por Mim",
    description: "Compre nos marketplaces chineses e envie para o nosso armazém!",
    accent: "from-gold to-gold/70",
    href: "/servicos#envie-por-mim",
  },
  {
    icon: MessageCircleQuestion,
    title: "Fazer Perguntas",
    description: "Contatamos vendedores chineses e fazemos perguntas em seu nome.",
    accent: "from-gold to-china-red",
    href: "/#contact",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">O que oferecemos</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-3">Nossos Serviços</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Tudo que você precisa para comprar da China com segurança e facilidade
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="group relative bg-background rounded-2xl p-7 border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`}}
              />
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
