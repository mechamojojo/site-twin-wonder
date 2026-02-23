import { Users, Package } from "lucide-react";

const AboutSection = () => {
  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">About Us</h2>
            <p className="text-xl text-primary font-semibold mb-4">Connecting The Chinese Market With The World</p>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              CSSBuy provides a hassle-free solution to the purchasing of goods on massive Chinese marketplace platforms, such as JD, Taobao, TMALL, 1688 and Weidan. These marketplaces contain billions of products, and you can find everything on here.
            </p>
            <a href="#" className="inline-block mt-4 text-primary font-medium text-sm hover:underline">
              Read More →
            </a>
          </div>

          {/* Quality Service */}
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">quality service</p>
            <h3 className="text-2xl font-heading font-bold text-foreground mb-3">
              Providing quality service & products to our customers
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Various payment methods, quality inspection in the warehouse, unlimited QC images, splitting orders, and long free storage time. We pack your package professionally with protected packing materials.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            <div className="flex items-center gap-4 bg-background rounded-xl p-5 border border-border shadow-card">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-2xl text-foreground">1,200,000+</p>
                <p className="text-sm text-muted-foreground">Customers Served</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-background rounded-xl p-5 border border-border shadow-card">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-2xl text-foreground">1M+</p>
                <p className="text-sm text-muted-foreground">Products Available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
