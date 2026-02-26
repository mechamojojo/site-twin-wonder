import { UserPlus, ShoppingBag, PackageCheck, Truck } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Crie sua conta",
    description: "Cadastre-se gratuitamente em poucos minutos na nossa plataforma.",
    link: { text: "Criar uma conta", href: "#" },
  },
  {
    icon: ShoppingBag,
    step: "02",
    title: "Escolha seus produtos",
    description: "Navegue pelos marketplaces ou cole o link do produto desejado.",
    link: { text: "Ver guia do comprador", href: "#" },
  },
  {
    icon: PackageCheck,
    step: "03",
    title: "Inspeção de qualidade",
    description: "Verificamos aparência, tamanho e qualidade quando o item chega ao armazém.",
    link: null,
  },
  {
    icon: Truck,
    step: "04",
    title: "Envio para o Brasil",
    description: "Quando tudo estiver pronto, enviamos diretamente para sua casa.",
    link: { text: "Ver guias de envio", href: "#" },
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-china-red uppercase tracking-widest">Passo a passo</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">
            Como funciona?
          </h2>
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
                <a href={step.link.href} className="text-sm text-china-red font-semibold hover:underline mt-auto">
                  {step.link.text} →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
