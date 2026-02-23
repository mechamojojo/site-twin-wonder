import { ShoppingCart, Truck, Package, MessageCircleQuestion, Users, Award } from "lucide-react";

const services = [
  {
    icon: ShoppingCart,
    title: "Buy For Me",
    description: "We purchase products from China online stores on behalf of you",
    link: "#",
  },
  {
    icon: Truck,
    title: "Ship For Me",
    description: "Shop with the massive Chinese marketplaces you desire and send to our Warehouse address yourself!",
    link: "#",
  },
  {
    icon: Package,
    title: "Drop Shipping",
    description: "We offer order fulfilment directly from China. Ship from China to all over the world in a click of a few buttons.",
    link: "#",
  },
  {
    icon: MessageCircleQuestion,
    title: "Asking Question",
    description: "We can contact sellers on massive Chinese based marketplaces, and ask them questions on your behalf.",
    link: "#",
  },
  {
    icon: Users,
    title: "FBA To Amazon",
    description: "We can assist you by shipping directly from China to Amazon FBA, saving you money and time.",
    link: null,
  },
  {
    icon: Award,
    title: "Reviews Rewards",
    description: "Make creative posts and share your experience using our service to get rewards",
    link: "#",
  },
];

const ServicesSection = () => {
  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">Our Services</h2>
          <p className="text-muted-foreground text-lg">We offer our customers a range of amazing benefits</p>
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
                  Learn more →
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
