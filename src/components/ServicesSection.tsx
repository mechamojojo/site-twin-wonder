import { ShoppingCart, Truck, Package, MessageCircleQuestion, Users, Award } from "lucide-react";

const services = [
  {
    icon: ShoppingCart,
    title: "Compre Por Mim",
    description: "Compramos produtos de lojas online da China em seu nome",
    link: "#",
  },
  {
    icon: Truck,
    title: "Envie Por Mim",
    description: "Compre nos grandes marketplaces chineses e envie para o nosso endereço de armazém!",
    link: "#",
  },
  {
    icon: Package,
    title: "Drop Shipping",
    description: "Oferecemos atendimento de pedidos diretamente da China. Envie da China para o Brasil com poucos cliques.",
    link: "#",
  },
  {
    icon: MessageCircleQuestion,
    title: "Fazer Perguntas",
    description: "Podemos contatar vendedores nos grandes marketplaces chineses e fazer perguntas em seu nome.",
    link: "#",
  },
  {
    icon: Users,
    title: "FBA Para Amazon",
    description: "Podemos ajudá-lo enviando diretamente da China para o Amazon FBA, economizando dinheiro e tempo.",
    link: null,
  },
  {
    icon: Award,
    title: "Recompensas por Avaliações",
    description: "Faça posts criativos e compartilhe sua experiência usando nosso serviço para ganhar recompensas",
    link: "#",
  },
];

const ServicesSection = () => {
  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">Nossos Serviços</h2>
          <p className="text-muted-foreground text-lg">Oferecemos aos nossos clientes uma série de benefícios incríveis</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="group bg-background rounded-xl p-6 border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <service.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-heading font-bold text-foreground text-lg mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{service.description}</p>
              {service.link && (
                <a href={service.link} className="text-sm text-primary font-medium hover:underline">
                  Saiba mais →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
