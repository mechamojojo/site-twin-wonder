import { UserPlus, ShoppingBag, PackageCheck, Truck } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Become a member",
    description: "You can create your account and register on our platform.",
    link: { text: "Create an account", href: "#" },
  },
  {
    icon: ShoppingBag,
    title: "Buy The Items You Want",
    description: "You can browse through our stores or order through links.",
    link: { text: "View buyers guide", href: "#" },
  },
  {
    icon: PackageCheck,
    title: "SKU verification conducted by us",
    description: "Once the item arrives at our location, we will verify its appearance, size, etc., for you.",
    link: null,
  },
  {
    icon: Truck,
    title: "Process The Shipment",
    description: "Once everything done you can process for the shipping.",
    link: { text: "View shipping guides", href: "#" },
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
