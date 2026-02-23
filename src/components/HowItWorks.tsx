import { UserPlus, ShoppingBag, PackageCheck, Truck } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Torne-se um membro",
    description: "Você pode criar sua conta e se registrar em nossa plataforma.",
    link: { text: "Criar uma conta", href: "#" },
  },
  {
    icon: ShoppingBag,
    title: "Compre os itens que deseja",
    description: "Você pode navegar pelas nossas lojas ou fazer pedidos através de links.",
    link: { text: "Ver guia do comprador", href: "#" },
  },
  {
    icon: PackageCheck,
    title: "Verificação de qualidade feita por nós",
    description: "Quando o item chegar ao nosso armazém, verificaremos a aparência, tamanho, etc., para você.",
    link: null,
  },
  {
    icon: Truck,
    title: "Processar o envio",
    description: "Quando tudo estiver pronto, você pode processar o envio para o Brasil.",
    link: { text: "Ver guias de envio", href: "#" },
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border shadow-card hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{step.description}</p>
              {step.link && (
                <a href={step.link.href} className="text-sm text-primary font-medium hover:underline">
                  {step.link.text}
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
